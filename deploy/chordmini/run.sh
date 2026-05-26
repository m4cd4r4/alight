#!/bin/sh
# Canonical run command for the Alight ChordMini backend on the VPS.
# Bound to localhost only (nginx fronts it with the bearer-token gate),
# resource-capped so it can't starve the VPS's production services, and with the
# YouTube cookies dir mounted read-write (yt-dlp reads + refreshes the session).
#
# Cookies: drop a Netscape cookies.txt at /opt/chordmini-recon/cookies/youtube.txt
# (exported from a logged-in YouTube session). Empty/absent -> runs without them.
#
# YT_PROXY: SOCKS5 endpoint that egresses through a residential IP. See
# tunnel-up.sh - we run `ssh -R 172.17.0.1:1080 root@VPS` from Macdara's Perth
# workstation, then point yt-dlp at it. Without this, popular videos return
# SABR-only responses from the VPS IP.
set -e
PORT=$(cat /opt/chordmini-recon/.alight_port)
mkdir -p /opt/chordmini-recon/cookies
chown -R 1001:1001 /opt/chordmini-recon/cookies   # container 'app' user uid

docker rm -f chordmini-alight 2>/dev/null || true
docker run -d --name chordmini-alight --restart unless-stopped \
  -p 127.0.0.1:"$PORT":8080 \
  --memory=4g --memory-swap=4g --cpus=2 \
  -v /opt/chordmini-recon/cookies:/cookies \
  -v /opt/chordmini-recon/python_backend/alight_ingest.py:/app/alight_ingest.py:ro \
  -v /opt/chordmini-recon/python_backend/alight_app.py:/app/alight_app.py:ro \
  -e YT_PROXY="${YT_PROXY:-socks5h://172.17.0.1:1080}" \
  chordmini-lean:latest
