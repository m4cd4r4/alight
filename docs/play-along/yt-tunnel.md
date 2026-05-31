# Why the YouTube path depends on a Perth -> Donnacha tunnel

## TL;DR

YouTube does not serve real audio formats to datacentre IPs any more, no matter
which client (web, mweb, tv, ios, android) or which cookie set you present.
Every popular video returns SABR-streaming-only formats and storyboard images.
The only paths that work today are:

- An IP that YouTube classifies as residential, OR
- A long-aged Premium account's logged-in cookies on a low-volume IP, OR
- A paid residential-proxy provider (Bright Data, Smartproxy, Oxylabs).

Alight does the first thing, for free, by reverse-SSH-tunnelling from Macdara's
Perth workstation to the Donnacha VPS and pointing `yt-dlp` at the resulting
SOCKS5 endpoint.

## Architecture

```
+-------------------------+      ssh -R 172.17.0.1:1080       +----------------------------+
| Perth workstation       | <-------------------------------- |  Donnacha VPS              |
| (residential IP,        |                                   |  (datacentre IP)           |
|  Telstra/iiNet)         |                                   |                            |
|                         |                                   |  docker0:1080  <-- SOCKS5  |
+-----------+-------------+                                   |  served by SSH server      |
            |                                                 |                            |
            | egress for                                      |  +----------------------+  |
            v                                                 |  | chordmini-alight     |  |
    YouTube serves real audio                                 |  | YT_PROXY=socks5h://  |  |
    formats to residential IPs                                |  | 172.17.0.1:1080      |  |
                                                              |  | -> yt-dlp uses Perth |  |
                                                              |  +----------------------+  |
                                                              +----------------------------+
                                                                          |
                                                                          v
                                                                /api/analyze returns
                                                                chords + beats + lyrics
```

## What we tried first

Before landing on the tunnel, the YouTube path went through four iterations:

1. **VPS direct, no cookies** - bot-checked after a few requests.
2. **VPS direct, throwaway YouTube cookies** - bot check went away, but
   `yt-dlp` started returning only storyboard images: SABR.
3. **Browser-side extraction via `youtubei.js` + a Vercel CORS relay** (the
   chordmini.me technique on paper). Got past every fetch quirk - Request vs
   init shapes, GET/HEAD body rejection, method preservation - but Vercel's IP
   pool is treated identically to a VPS. Same SABR wall.
4. **Server-side via residential SSH tunnel** - works.

Path 3 is now removed from the codebase to keep the surface small. The trimmed
client is back to a single POST to `/api/analyze` with `{ youtubeUrl }`.

## Operational contract

| Component                  | What it owns                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| Perth workstation          | Runs the SSH client loop, provides the residential egress IP                 |
| Donnacha sshd              | `GatewayPorts clientspecified` so `-R 172.17.0.1:1080` is allowed            |
| Donnacha UFW               | `allow from 172.17.0.0/16 to 172.17.0.1 port 1080 proto tcp`                 |
| ChordMini container        | `-e YT_PROXY=socks5h://172.17.0.1:1080`, deno installed (signature solving)  |
| ChordMini cookies          | `/opt/chordmini-recon/cookies/youtube.txt` (still needed for the bot check)  |
| `alight_ingest.py`         | Passes `--cookies` + `--proxy` to yt-dlp on every call                       |

## When YouTube extraction fails

The user sees `Could not fetch audio for that link.` in the analyze panel.
Diagnose in this order:

1. Is the workstation on? Tunnel is gone if not.
2. SSH tunnel up? On the VPS:

   ```bash
   ss -ltn | grep 1080
   # 172.17.0.1:1080 should be listening
   ```

3. Does the SOCKS endpoint egress through Perth?

   ```bash
   ssh root@YOUR_VPS_IP 'curl --socks5-hostname 172.17.0.1:1080 https://api.ipify.org'
   # Should return your Perth residential IP, not YOUR_VPS_IP.
   ```

4. Cookies still valid?

   ```bash
   ssh root@YOUR_VPS_IP 'wc -l /opt/chordmini-recon/cookies/youtube.txt'
   # Empty file -> we run cookie-less, which hits the bot check.
   ```

5. yt-dlp + deno still in the running container?

   ```bash
   ssh root@YOUR_VPS_IP 'docker exec chordmini-alight bash -c "/opt/venv/bin/yt-dlp --version; /usr/local/bin/deno --version"'
   ```

## Fallback if the tunnel is permanently gone

- The upload path always works - users can save audio locally and drag it onto
  the analyse panel. Vercel's body limit caps the file at about 3 MB raw.
- If you want a hands-off solution, pay for a residential-proxy provider and
  set `YT_PROXY` to their SOCKS5 endpoint. Same code path; no app changes
  needed.

## See also

- [deploy/perth-tunnel/README.md](../../deploy/perth-tunnel/README.md) - how to
  start, persist, and inspect the tunnel on Windows.
- [deploy/chordmini/Dockerfile](../../deploy/chordmini/Dockerfile) - the deno
  + upgraded yt-dlp install that powers signature solving.
- [deploy/chordmini/alight_ingest.py](../../deploy/chordmini/alight_ingest.py)
  - the Flask blueprint that wires `YT_PROXY` into `yt-dlp` invocations.
