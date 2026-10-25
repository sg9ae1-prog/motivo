# Motivo site

The public static website for Motivo: the landing page with the early sign-up, plus the privacy policy, terms, support and delete-account pages. It is plain HTML and CSS with no build step, published from this repository on GitHub Pages.

- **Preview:** `python3 -m http.server 8765`, then open http://localhost:8765/
- **Test:** `node --test` (Node built-ins only, nothing to install)

Layout:

- `index.html`: the landing page; `privacy/`, `terms/`, `support/`, `delete-account/`: one folder per legal page.
- `404.html`: the not-found page; its links start with `/motivo/` because it is served at any URL depth.
- `assets/`: shared styles (`site.css`, `landing.css`), scripts, self-hosted fonts, images (including the share image `og.png`) and `vendor/` (the pinned third-party libraries, so the page makes no third-party request).
- `tests/`: the `node --test` suite.
- `tools/bake-avatar.mjs`: draws the looks Motivo opens with (`assets/avatar-looks.js`) ahead of time into `assets/avatar-baked.js`, so the page needn't download the drawing library (`assets/bigheads.js`) before showing him; the library loads in the background for restyling. Re-run it after changing those looks or the library; the tests fail if the drawings are stale.
