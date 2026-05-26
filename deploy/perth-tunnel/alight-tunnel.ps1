# Persistent SSH reverse SOCKS tunnel: Perth workstation -> Donnacha VPS.
#
# Exposes a SOCKS5 endpoint on the VPS's docker0 bridge (172.17.0.1:1080) that
# egresses through this machine's residential IP. The ChordMini container reads
# YT_PROXY=socks5h://172.17.0.1:1080 and routes yt-dlp through it - YouTube
# returns SABR/storyboard-only formats to the datacentre IP otherwise.
#
# Runs as a foreground loop with auto-reconnect (SSH keepalive + restart on
# exit). Wire up as a Scheduled Task at logon - see README.md in this folder.
#
# Stop with Ctrl+C in the foreground; the scheduled task gets stopped via
# `Stop-ScheduledTask -TaskName "Alight YT Tunnel"`.

$ErrorActionPreference = "Continue"
$VPS = "root@45.77.233.102"
$Bind = "172.17.0.1:1080"
$LogDir = Join-Path $env:LOCALAPPDATA "alight-tunnel"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$LogFile = Join-Path $LogDir "tunnel.log"

function Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

Log "alight-tunnel start (bind=$Bind, vps=$VPS)"

while ($true) {
    # ServerAliveInterval/CountMax: 60s keepalive, drop after 3 missed -> we get
    # back to the reconnect loop within ~3 minutes if the link dies silently.
    # ExitOnForwardFailure: if the remote port is already bound, fail fast so
    # the loop sleeps + retries instead of pretending success.
    $args = @(
        "-N",
        "-R", $Bind,
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=60",
        "-o", "ServerAliveCountMax=3",
        "-o", "StrictHostKeyChecking=accept-new",
        $VPS
    )
    Log "ssh $($args -join ' ')"
    & ssh @args 2>&1 | ForEach-Object { Log "ssh: $_" }
    $exit = $LASTEXITCODE
    Log "ssh exited with $exit; sleeping 5s before reconnect"
    Start-Sleep -Seconds 5
}
