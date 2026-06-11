// Build-time flags. Vite inlines `import.meta.env.VITE_*` as literals, so a
// public build (VITE_PUBLIC_ONLY=1) tree-shakes the online features out.

/**
 * Public, public-domain-only build: no access gate, and the Load view shows only
 * the bundled PD library and the client-side chord-sheet paste - the title
 * search, YouTube search and play-along/analyze features (the only parts that
 * need a backend) are dropped. Default (unset) = the full gated app.
 */
export const PUBLIC_ONLY = import.meta.env.VITE_PUBLIC_ONLY === "1";
