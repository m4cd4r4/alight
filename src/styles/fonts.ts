// Self-hosted webfonts, bundled by Vite (no runtime dependency on
// fonts.googleapis.com). Replaces the Google Fonts @import that used to live in
// colors_and_type.css. Both families are OFL-1.1, free to bundle and serve.
//
// Faces match what the app actually uses: Spectral 300/400/500/600 + 400 italic
// (display), Atkinson Hyperlegible 400/700 + italics (text). latin + latin-ext
// only - latin-ext covers the accented titles in the library (Frère Jacques,
// Für Elise, Dvořák, Saint-Saëns) without pulling in cyrillic/vietnamese.

import "@fontsource/spectral/latin-300.css";
import "@fontsource/spectral/latin-ext-300.css";
import "@fontsource/spectral/latin-400.css";
import "@fontsource/spectral/latin-ext-400.css";
import "@fontsource/spectral/latin-400-italic.css";
import "@fontsource/spectral/latin-ext-400-italic.css";
import "@fontsource/spectral/latin-500.css";
import "@fontsource/spectral/latin-ext-500.css";
import "@fontsource/spectral/latin-600.css";
import "@fontsource/spectral/latin-ext-600.css";

import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-400.css";
import "@fontsource/atkinson-hyperlegible/latin-400-italic.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-400-italic.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-700.css";
import "@fontsource/atkinson-hyperlegible/latin-700-italic.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-700-italic.css";
