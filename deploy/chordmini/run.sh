#!/bin/sh
# Canonical run command for the Alight ChordMini backend on the VPS.
# Bound to localhost only (nginx fronts it with the bearer-token gate),
# resource-capped so it can't starve the VPS's production services, and with the
# YouTube cookies dir mounted read-write (yt-dlp reads + refreshes the session).
#
# Cookies: drop a Netscape cookies.txt at /opt/chordmini-recon/cookies/youtube.txt
# (exported from a logged-in YouTube session). Empty/absent -> runs without them.
set -e
PORT=$(cat /opt/chordmini-recon/.alight_port)
mkdir -p /opt/chordmini-recon/cookies
chown -R 1001:1001 /opt/chordmini-recon/cookies   # container 'app' user uid

docker rm -f chordmini-alight 2>/dev/null || true
docker run -d --name chordmini-alight --restart unless-stopped \
  -p 127.0.0.1:"$PORT":8080 \
  --memory=4g --memory-swap=4g --cpus=2 \
  -v /opt/chordmini-recon/cookies:/cookies \
  chordmini-lean:latest
