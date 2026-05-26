# Perth -> Donnacha SSH reverse tunnel

This tunnel is **load-bearing** for the YouTube path in Alight. Without it the
ChordMini container on the VPS only gets SABR/storyboard formats from YouTube
(datacentre IPs are not served real audio), and `/api/analyze` returns
`Could not fetch audio for that link.` for any popular video.

## What it does

```
Perth workstation                              Donnacha VPS                    YouTube
+---------------+   reverse SOCKS5 over SSH    +-------------------------+   real
| residential   |  <------------------------+  | docker0:1080            |   audio
| IP            |                              | (only reachable from    |   streams
| 110.x.x.x     |                              |  containers + host)     |
+---------------+                              +-----------+-------------+
                                                           |
                                               +-----------v-------------+
                                               | chordmini-alight        |
                                               | YT_PROXY=socks5h://     |
                                               | 172.17.0.1:1080         |
                                               | -> yt-dlp uses Perth's  |
                                               |    residential egress   |
                                               +-------------------------+
```

The SOCKS server lives in the OpenSSH client (dynamic remote forward, `-R port`
syntax, OpenSSH 7.6+). No extra binary on Perth, no extra binary on the VPS.

## One-off setup (already done; documented for restoring on a new machine)

1. **VPS sshd** must allow remote forwarding to non-loopback interfaces. Edit
   `/etc/ssh/sshd_config` on the VPS:

   ```
   GatewayPorts clientspecified
   ```

   Then `systemctl reload ssh`. (Already set on Donnacha.)

2. **VPS UFW** must permit container -> host docker0:1080:

   ```bash
   ufw allow from 172.17.0.0/16 to 172.17.0.1 port 1080 proto tcp \
     comment "alight: SOCKS tunnel for YT egress"
   ufw reload
   ```

3. **ChordMini container** must launch with `YT_PROXY` set (see
   `deploy/chordmini/run.sh`):

   ```
   -e YT_PROXY=socks5h://172.17.0.1:1080
   ```

## Running the tunnel persistently on Perth

### Start it now (foreground, Ctrl+C to stop)

```powershell
pwsh -File I:\Scratch\piano-chords-play-along\deploy\perth-tunnel\alight-tunnel.ps1
```

### Register as a Scheduled Task that auto-starts at logon

```powershell
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -File I:\Scratch\piano-chords-play-along\deploy\perth-tunnel\alight-tunnel.ps1"
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName "Alight YT Tunnel" -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Limited
Start-ScheduledTask -TaskName "Alight YT Tunnel"
```

### Stop / inspect / remove

```powershell
Stop-ScheduledTask -TaskName "Alight YT Tunnel"
Get-ScheduledTask -TaskName "Alight YT Tunnel" | Get-ScheduledTaskInfo
Unregister-ScheduledTask -TaskName "Alight YT Tunnel" -Confirm:$false
```

Logs land at `%LOCALAPPDATA%\alight-tunnel\tunnel.log`.

## Verifying the tunnel from the VPS

```bash
ssh root@45.77.233.102
# Should listen on docker0:1080
ss -ltn | grep 1080
# Should return Perth's residential IP, not 45.77.233.102
curl --socks5-hostname 172.17.0.1:1080 https://api.ipify.org
# From inside the container too
docker exec chordmini-alight bash -lc \
  'curl -sS -m 8 --socks5-hostname 172.17.0.1:1080 https://api.ipify.org'
```

## Failure modes

| Symptom (from `/api/analyze`)                          | Diagnosis                  | Fix                                                                            |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------ |
| `Could not fetch audio for that link.` w/ "SABR"       | Tunnel down / not used     | Start the Perth tunnel; verify `YT_PROXY` env on the container                 |
| `Sign in to confirm you're not a bot`                  | Cookies missing or stale   | Refresh `/opt/chordmini-recon/cookies/youtube.txt` from a logged-in session    |
| `Signature extraction failed` / only storyboards       | deno missing in container  | Rebuild image (Dockerfile installs deno) or `apt-get install` + deno install   |
| Long timeouts then 502                                 | Workstation offline        | Ship resolves the moment your machine is back on; no VPS-side action required  |

## Why not autossh / Plink / WSL?

- `autossh` is Linux-native; on Windows it needs Cygwin/MSYS. The PowerShell
  loop above does the same job (reconnect + log) in 30 lines and zero extra deps.
- Plink (PuTTY) handles tunnels but its `-R` syntax differs slightly and it
  doesn't ship with Win11 out of the box. OpenSSH is built in since 2018.
- A WSL `autossh` would work but adds a moving part for no benefit when the
  tunnel itself runs entirely through Windows OpenSSH.
