# About

[简体中文](ABOUT.md) · **English**

## What this is

A **single-file, dependency-free, offline-capable** visualization template for multi-criteria rankings.

It compares 20 entries across 6 dimensions on a radar chart, with sequential playback, inline score editing, editable achievement text, and a BEST transition animation that fires when an entry tops any dimension.

**The whole application is one `index.html`.** No build step, no `npm install`, no CDN dependencies. Clone it and double-click — it also runs fully offline.

## What it's good for

This template started as a year-end music ranking (radar chart + sequential transitions + BEST showcase), but all domain-specific content has been abstracted out. It now fits any "many objects × many criteria" scoring scenario:

- **Year-end rankings** — top 10 albums, top 20 cast members, annual lists
- **Product reviews** — 20 products × 6 criteria (performance / price / build / support…)
- **Vendor comparison** — 20 candidate solutions × 6 scoring items
- **Education** — 20 students × 6 competency axes
- **Game reviews** — 20 titles × 6 experience scores
- **Tech selection** — 20 libraries/frameworks × 6 technical dimensions

If your data can be expressed as "each entry has a score on each of N dimensions," it fits.

## Interface layout

| Area | Contents |
|---|---|
| Intro | Rules screen: blank radar diagram + dimension weights and descriptions + reporting period. Click anywhere to enter |
| Main, left | Radar chart + background rank watermark (e.g. `1`) |
| Main, right | Entry name + rank badge, achievement tags, entry photo, achievement grid, progress bar |
| Bottom | Global timeline, draggable to seek |
| Top right | Session timer |
| Hidden panels | Photo manager (📷 button), template customization panel ("自定义" button) |
| Presentation mode | `Ctrl+Shift+P` hides all the above, leaving only the clean view; ranking stays fully functional |

## Core features

**Editable data.** Scores and achievement text are editable in-page and persisted to localStorage. Score panel shortcut: `Ctrl+E`.

**Photo setup.** Bulk-select a local folder; filenames (minus extension) are matched against entry names automatically. Individual upload, cropping, alignment, and PNG export are also supported. Cropped results are stored as **JPEG** (~1/8 the size of PNG), and failures are reported explicitly rather than silently swallowed — if a write doesn't fit, you get actual usage plus what to do about it.

**Presentation mode.** For recording, screen sharing, or live demos: one keystroke hides every management entry point and floating panel, leaving just the ranking. It works by adding a single class to `body` without touching any rendering logic, so the chart, animations, keyboard controls, timeline, and BEST transitions all keep working.

**Automatic BEST detection.** When an entry holds the highest score in any dimension, it's marked BEST and triggers a dedicated transition. **Ties are all marked** — no arbitrary pick-one tie-breaking. Detection runs after the user's edit cache is loaded, so changing scores updates BEST immediately.

**Self-adapting radar layout.** Each entry's chart is scaled and centered independently, computed in real time:
- Compute the full bounding box of the data polygon and its text labels
- Binary-search the largest scale that fits inside the canvas (96px margin)
- Translate the chart to center it on the bounding box
- Animate both scale and offset with a quintic ease

See [README.en.md](README.en.md) for the full walkthrough.

**Image performance.** This template was built to handle image-switching jank at scale:
- One-time dataURL → `blob:` URL conversion, avoiding repeated main-thread base64 decoding
- `img.decode()` pre-decoding so swapping `src` is nearly free
- LRU cache capped at 6 decoded bitmaps to bound memory
- `requestIdleCallback` progressive prefetching so startup doesn't contend for the main thread
- Transition tokens to discard stale async results when switching rapidly

**Order-based theme colors.** Colors come from a 20-entry palette indexed by rank order, not by name. Renaming, reordering, adding, or removing entries never misaligns colors, and adjacent entries are always distinguishable. The palette cycles past 20.

**Single source of truth for dimensions.** The rules screen, radar labels, and score panel all generate from `dimNames` / `rankingWeightPercent` / `dimDescriptions`. Change one place and it applies everywhere — no risk of the rules screen showing a stale dimension name.

## Ranking logic (important)

The template deliberately separates **ranking** from **display** so they can't interfere with each other.

**Ranking** uses only `weightedScoreUnits(points)`:

```js
const rankingWeightPercent = [25, 20, 20, 13, 10, 12];

function weightedScoreUnits(points) {
    return points.reduce((sum, score, dimension) =>
        sum + Math.round(score * 100) * rankingWeightPercent[dimension], 0);
}
```

Multiplying by 100 and rounding first converts floats to integers before accumulating. This prevents float-precision misrankings — cases where two entries are mathematically equal but the runtime disagrees. Such bugs are extremely hard to trace.

**Ties** follow standard competition ranking: equal scores share the best placement (1, 2, 2, 4). Implemented by scanning the sorted array for runs of equal weighted scores.

**Displayed totals** use a separate three-segment linear mapping anchored at 7.83 / 8.5 / 10.485, stretching only the above-8.5 segment so the top end overflows further. **This mapping never participates in ranking** — placements, ties, and relative tiers are unaffected by display tuning.

## Tech stack

- Vanilla HTML + CSS + JavaScript, no framework
- Canvas 2D for the radar chart, SVG for the rules-screen diagram
- ES2020+ syntax (optional chaining, nullish coalescing)
- `requestIdleCallback` (with a `setTimeout` fallback)
- localStorage for persistence

**Zero external requests.** No CDN assets, no face-detection library, no network calls beyond loading the `file://` page itself.

## Project structure

```
radar-chart-top20/
├── index.html       # The entire app (HTML + CSS + JS, ~5150 lines)
├── README.md        # Quick start + config reference (Chinese)
├── README.en.md     # This document's sibling — full English README
├── GUIDE.md         # Non-programmer guide (Chinese)
├── TUTORIAL.md      # Developer tutorial (Chinese)
├── ABOUT.md         # Project overview (Chinese)
├── ABOUT.en.md      # Project overview (English)
├── test/
│   └── rank.test.cjs  # Ranking / tie-breaking tests
├── LICENSE          # MIT
├── preview.png      # Screenshot
├── preview-present-mode.png  # Presentation mode screenshot
└── .gitignore
```

## License

MIT.
