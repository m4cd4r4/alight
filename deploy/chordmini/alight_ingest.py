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
import re
import subprocess
import time
import uuid

from flask import Blueprint, jsonify, request
from utils.paths import AUDIO_DIR

bp = Blueprint("alight_ingest", __name__)

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
            ["yt-dlp", "-q", "--no-progress", "--no-playlist",
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
            ["yt-dlp", "-q", "--no-warnings", "--skip-download", "--no-playlist",
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
