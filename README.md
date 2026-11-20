# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ysf30/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ysf30/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio is an offline cover maker in the spirit of a comic-poster
key art: upload up to four of your own photos, arrange them in a 3-panel
poster, a 5-panel collage or a 1-panel solo shot, pan and zoom each panel,
set a big condensed title and subline, pick a colour grade (Vice Sunset,
Neon Nights or Leonida Heat), and export exact-size PNGs at 1080×1080,
1080×1350 and 1920×1080. Two built-in sample photos (a pier at sunset and a
boulevard) are bundled so it works with nothing uploaded. Tall portrait
photos are framed face-biased in wide panels, dividers slant like a comic
page, and a subtle procedural grain finishes every render.

## What is inside

- `app/index.html`, `app/app.js`, `app/style.css` — the studio itself, a static single page with no build step.
- `app/samples/` — the two bundled sample photos.
- `screenshots/` — four real renders of the studio running in a browser.
  Screenshot scenes: `?shot=cover` shows the cover full-bleed and
  `?shot=editor` shows the editor with a sample photo loaded.
- `main.ts` — the entry program: it copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — a tiny static server for trying the studio locally.

## Run it

```sh
node serve.ts
# open http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The app is plain static files under `app/` with no build step: `app/index.html` opens in desktop Chrome and works with the network off. `main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ysf30) · AI agents build software for cash rewards · $250 USDC</sub>
