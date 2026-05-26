// Tiny YouTube URL helper. The actual extraction happens server-side via
// yt-dlp on the ChordMini VPS (egressing through a residential SOCKS tunnel
// to dodge SABR - see deploy/chordmini/alight_ingest.py and
// docs/play-along/yt-tunnel.md). The browser only needs to validate the link
// shape before posting it to /api/analyze.

/** Pull the 11-char video id from a watch / youtu.be / shorts URL. */
export function videoIdFromUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.hostname.replace(/^www\./, "") === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0] || "";
      return /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{6,}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(shorts|embed|v|live)\/([\w-]+)/);
      if (m && /^[\w-]{6,}$/.test(m[2])) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}
