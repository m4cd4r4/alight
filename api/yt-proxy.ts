// CORS relay for browser-side YouTube extraction.
//
// The browser-side youtubei.js client routes every YouTube/googlevideo HTTP
// call through this function. We need the relay for two reasons: (a) the
// browser cannot call those hosts directly because they do not allow CORS; (b)
// we strip identifying client headers and override User-Agent / Referer so
// YouTube sees a plausible browser, matching the technique chordmini.me uses
// in production from Vercel's IP pool (the VPS IP is SABR-blocked).
//
// Gated by the same x-alight-gate header as /api/analyze so it cannot be used
// as an open relay.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { maxDuration: 60 };

const GATE_PASSWORD = process.env.ALIGHT_PASSWORD || "alight2026";

// Allow only YouTube's own surfaces (Innertube + media + thumbnails + signature
// scripts). Anything else is rejected so this is not a generic open relay.
const ALLOWED_HOST_RE =
  /^https:\/\/([\w-]+\.)*(youtube\.com|googlevideo\.com|ytimg\.com|ggpht\.com|youtube-nocookie\.com)(\/|$)/i;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function setCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-alight-gate, Range, X-Override-Referer, X-Override-User-Agent");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (String(req.headers["x-alight-gate"] || "") !== GATE_PASSWORD) {
    res.status(401).json({ error: "locked" });
    return;
  }

  const target = String(req.query.url || "");
  if (!ALLOWED_HOST_RE.test(target)) {
    res.status(400).json({ error: "Disallowed target." });
    return;
  }

  // Forward client headers (Innertube needs the X-YouTube-Client-* ones), drop
  // the ones that would leak our caller / break upstream, and force a plausible
  // browser User-Agent + Referer so YouTube treats us like one.
  const SKIP = new Set([
    "host", "content-length", "transfer-encoding", "connection", "cookie",
    "x-alight-gate", "x-vercel-id", "x-forwarded-for", "x-forwarded-host",
    "x-forwarded-proto", "x-real-ip", "x-vercel-deployment-url", "forwarded",
    "user-agent", "referer", "origin",
    "x-override-user-agent", "x-override-referer",
  ]);
  const headers: Record<string, string> = {
    "User-Agent": String(req.headers["x-override-user-agent"] || BROWSER_UA),
    Referer: String(req.headers["x-override-referer"] || "https://www.youtube.com/"),
    Origin: "https://www.youtube.com",
    "Accept-Language": "en-US,en;q=0.9",
  };
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string" && !SKIP.has(k.toLowerCase())) headers[k] = v;
  }

  let body: string | undefined;
  if (req.method === "POST") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(target, { method: req.method, headers, body });
    res.status(upstream.status);
    for (const h of ["content-type", "content-range", "content-length", "accept-ranges"] as const) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch {
    res.status(502).json({ error: "upstream error" });
  }
}
