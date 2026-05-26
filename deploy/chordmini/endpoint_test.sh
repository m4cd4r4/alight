#!/bin/sh
# Smoke-test the three endpoints Alight uses, from inside the container.
# Synthesises a C-G-Am-F progression (sine triads we own, no copyright) for the
# audio endpoints; queries LRCLIB for a well-known song for the lyrics shape.
set -e
cd /tmp

echo "generating chord progression (C G Am F, 3s each)..."
ffmpeg -y -f lavfi -i "aevalsrc='0.25*sin(2*PI*261.63*t)+0.25*sin(2*PI*329.63*t)+0.25*sin(2*PI*392.00*t)':d=3:s=44100" -ac 1 c.wav  >/dev/null 2>&1
ffmpeg -y -f lavfi -i "aevalsrc='0.25*sin(2*PI*196.00*t)+0.25*sin(2*PI*246.94*t)+0.25*sin(2*PI*293.66*t)':d=3:s=44100" -ac 1 g.wav  >/dev/null 2>&1
ffmpeg -y -f lavfi -i "aevalsrc='0.25*sin(2*PI*220.00*t)+0.25*sin(2*PI*261.63*t)+0.25*sin(2*PI*329.63*t)':d=3:s=44100" -ac 1 am.wav >/dev/null 2>&1
ffmpeg -y -f lavfi -i "aevalsrc='0.25*sin(2*PI*174.61*t)+0.25*sin(2*PI*220.00*t)+0.25*sin(2*PI*261.63*t)':d=3:s=44100" -ac 1 f.wav  >/dev/null 2>&1
printf "file c.wav\nfile g.wav\nfile am.wav\nfile f.wav\n" > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c copy prog.wav >/dev/null 2>&1
ffmpeg -y -i prog.wav -codec:a libmp3lame -q:a 4 prog.mp3 >/dev/null 2>&1
ls -la prog.mp3

echo "=== LYRICS (lrclib) ==="
curl -s -m 40 -X POST -H "Content-Type: application/json" -d '{"artist":"Coldplay","title":"Yellow"}' http://localhost:8080/api/lrclib-lyrics > /tmp/lyrics.json
head -c 500 /tmp/lyrics.json; echo

echo "=== BEATS (madmom) ==="
curl -s -m 300 -F "file=@/tmp/prog.mp3" -F "detector=madmom" http://localhost:8080/api/detect-beats > /tmp/beats.json
head -c 400 /tmp/beats.json; echo

echo "=== CHORDS (chord-cnn-lstm) ==="
curl -s -m 300 -F "file=@/tmp/prog.mp3" -F "detector=chord-cnn-lstm" http://localhost:8080/api/recognize-chords > /tmp/chords.json
head -c 900 /tmp/chords.json; echo

echo "ALL_TESTS_DONE"
