"""Alight ingest - a minimal YouTube-audio download endpoint.

ChordMini's own youtube blueprint is broken in this build (its __init__ imports
a routes module that does not exist), so the app silently skips it. Alight needs
"YouTube URL -> audio on the server" so the existing recognize-chords /
detect-beats endpoints can analyse it. This adds exactly that one route, using
the same AUDIO_DIR the analysers read from. It is registered by alight_app.py
without editing any ChordMini module.

Auth: none here - the nginx reverse proxy enforces the bearer token, and the
container only listens on 127.0.0.1. This route shells out to yt-dlp, so it must
never be exposed unauthenticated.
"""
import os
import re
import subprocess
import time
import uuid

from flask import Blueprint, abort, jsonify, request, send_file
from utils.paths import AUDIO_DIR

bp = Blueprint("alight_ingest", __name__)

# YouTube blocks datacenter IPs with a bot check; logged-in cookies get past it.
# Mounted read-write so yt-dlp can refresh the session and extend its life.
# Absent or empty -> run without cookies (works for the rare unchallenged video).
COOKIES_FILE = os.environ.get("YT_COOKIES", "/cookies/youtube.txt")

# Datacenter IPs (Vultr) get SABR-blocked for popular videos even with cookies -
# YouTube returns no streamingData. The fix is to egress through a residential
# IP. Operationally that's an SSH reverse SOCKS tunnel from Macdara's Perth
# workstation: `ssh -R 172.17.0.1:1080 root@VPS` exposes the workstation's
# residential IP as a SOCKS5 endpoint on the docker0 bridge. yt-dlp picks it
# up via YT_PROXY. When unset, we run direct (which still works for unblocked
# videos and is the right fallback if the tunnel is down).
YT_PROXY = (os.environ.get("YT_PROXY") or "").strip()


def _cookie_args():
    try:
        if os.path.getsize(COOKIES_FILE) > 0:
            return ["--cookies", COOKIES_FILE]
    except OSError:
        pass
    return []


def _proxy_args():
    return ["--proxy", YT_PROXY] if YT_PROXY else []


def _extra_args():
    # All three are needed together:
    #   - proxy: egress via Perth (datacentre IPs get SABR-only formats)
    #   - cookies: bypass the "sign in to confirm you're not a bot" page
    #     that fires on the residential IP after a few anonymous requests
    #   - (deno is invoked transparently via $PATH for signature solving)
    return [*_cookie_args(), *_proxy_args()]

# A full watch URL on youtube.com / youtu.be / music.youtube.com only. fullmatch
# validates the whole string (an optional ?/&/# query tail is allowed, no
# whitespace), so the value passed to yt-dlp can never be an option-lookalike.
YT_RE = re.compile(
    r"https://(www\.|m\.|music\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w\-]{6,}(?:[?&#]\S*)?",
    re.I,
)
MAX_DURATION = 900  # seconds; refuse anything over 15 minutes
MAX_FILESIZE = "40M"
DOWNLOAD_TIMEOUT = 300
META_TIMEOUT = 60
REAP_AGE_S = 3600  # delete downloaded audio older than an hour


def _reap(directory):
    """Drop stale downloads so AUDIO_DIR cannot grow without bound and fill the
    shared VPS disk. Runs opportunistically on each download; the just-written
    files are far younger than the cutoff, so this never races the analysers."""
    try:
        now = time.time()
        for f in directory.iterdir():
            if f.is_file() and now - f.stat().st_mtime > REAP_AGE_S:
                f.unlink(missing_ok=True)
    except OSError:
        pass


@bp.route("/api/alight/yt-download", methods=["POST"])
def yt_download():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not YT_RE.fullmatch(url):
        return jsonify({"error": "A youtube.com or youtu.be watch URL is required."}), 400

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    _reap(AUDIO_DIR)
    vid = uuid.uuid4().hex
    out_tmpl = str(AUDIO_DIR / f"{vid}.%(ext)s")
    mp3_path = AUDIO_DIR / f"{vid}.mp3"

    try:
        dl = subprocess.run(
            ["yt-dlp", *_extra_args(), "-q", "--no-progress", "--no-playlist",
             "-f", "bestaudio", "-x", "--audio-format", "mp3",
             "--max-filesize", MAX_FILESIZE,
             "--match-filter", f"duration < {MAX_DURATION}",
             "-o", out_tmpl, url],
            capture_output=True, text=True, timeout=DOWNLOAD_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Fetching that audio timed out."}), 504

    if dl.returncode != 0 or not mp3_path.exists():
        for leftover in AUDIO_DIR.glob(f"{vid}.*"):  # drop any .part / partial format files
            leftover.unlink(missing_ok=True)
        return jsonify({
            "error": "Could not fetch audio for that link.",
            "detail": (dl.stderr or "").strip()[-300:],
        }), 502

    title, artist, duration = "", "", 0.0
    try:
        meta = subprocess.run(
            ["yt-dlp", *_extra_args(), "-q", "--no-warnings", "--skip-download", "--no-playlist",
             "--print", "%(title)s", "--print", "%(artist,uploader)s", "--print", "%(duration)s",
             url],
            capture_output=True, text=True, timeout=META_TIMEOUT,
        )
        lines = (meta.stdout or "").strip().split("\n")
        if len(lines) >= 1:
            title = lines[0]
        if len(lines) >= 2:
            artist = lines[1]
        if len(lines) >= 3:
            try:
                duration = float(lines[2])
            except ValueError:
                duration = 0.0
    except subprocess.TimeoutExpired:
        pass  # metadata is best-effort; the audio is what matters

    return jsonify({
        "audioUrl": f"/audio/{vid}.mp3",
        "audio_path": str(mp3_path),
        "title": title,
        "artist": artist,
        "duration": duration,
    })


# uuid4().hex names from yt_download: exactly 32 lowercase hex chars + ".mp3".
AUDIO_NAME_RE = re.compile(r"[0-9a-f]{32}\.mp3")


@bp.route("/audio/<name>", methods=["GET"])
def serve_audio(name):
    """Serve a downloaded mp3 for in-app playback, with HTTP Range support.

    Auth: none here, exactly like yt_download - nginx gates this route with a
    signed, time-limited secure_link URL (a browser <audio> GET can't carry the
    bearer token). We still hard-constrain `name` to the yt_download naming
    scheme so this can never read anything but a freshly-downloaded clip.
    """
    if not AUDIO_NAME_RE.fullmatch(name):
        abort(404)
    path = AUDIO_DIR / name
    if not path.is_file():
        abort(404)
    return send_file(path, mimetype="audio/mpeg", conditional=True)
