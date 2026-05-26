#!/bin/sh
# End-to-end backend pipeline test (run inside the container): a real YouTube URL
# through download -> chords -> beats -> lyrics, the exact sequence the Vercel
# proxy will drive.
set -e
B=http://localhost:8080
URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

echo "=== 1. yt-download ==="
DL=$(curl -s -m 300 -X POST -H "Content-Type: application/json" -d "{\"url\":\"$URL\"}" "$B/api/alight/yt-download")
AP=$(echo "$DL" | python3 -c "import sys,json;print(json.load(sys.stdin).get('audio_path',''))")
AU=$(echo "$DL" | python3 -c "import sys,json;print(json.load(sys.stdin).get('audioUrl',''))")
TITLE=$(echo "$DL" | python3 -c "import sys,json;print(json.load(sys.stdin).get('title',''))")
ARTIST=$(echo "$DL" | python3 -c "import sys,json;print(json.load(sys.stdin).get('artist',''))")
echo "audio_path=$AP | audioUrl=$AU | title=$TITLE | artist=$ARTIST"
[ -n "$AP" ] || { echo "ERROR: no audio_path"; echo "$DL" | head -c 300; exit 1; }

echo "=== 2. recognize-chords (audio_path) ==="
curl -s -m 300 -F "audio_path=$AP" -F "detector=chord-cnn-lstm" "$B/api/recognize-chords" > /tmp/p_chords.json
python3 -c "import json;d=json.load(open('/tmp/p_chords.json'));print('total:',d.get('total_chords'),'dur:',round(d.get('duration',0),1),'first6:',[(c['chord'],round(c['start'],1)) for c in d.get('chords',[])[:6]])"

echo "=== 3. detect-beats (audio_path, madmom) ==="
curl -s -m 300 -F "audio_path=$AP" -F "detector=madmom" "$B/api/detect-beats" > /tmp/p_beats.json
python3 -c "import json;d=json.load(open('/tmp/p_beats.json'));print('bpm:',d.get('bpm'),'sig:',d.get('time_signature'),'beats:',len(d.get('beats',[])))"

echo "=== 4. lrclib-lyrics (artist/title) ==="
curl -s -m 40 -X POST -H "Content-Type: application/json" -d "{\"artist\":\"$ARTIST\",\"title\":\"$TITLE\"}" "$B/api/lrclib-lyrics" > /tmp/p_lyrics.json
python3 -c "import json;d=json.load(open('/tmp/p_lyrics.json'));sl=d.get('synchronized_lyrics') or [];print('found:',d.get('found'),'synced lines:',len(sl),'first:',sl[0] if sl else None)"

echo "PIPELINE_DONE"
