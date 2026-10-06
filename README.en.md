# Radar Chart TOP20 Template

[简体中文](README.md) · **English**

A single-file web template for presenting multi-criteria rankings. Radar chart, sequential transitions, and automatic "strongest dimension" detection — ready to use with 20 entries across 6 dimensions.

Open `index.html` and it runs. No build step, no dependencies, no network calls, no server.

![Preview](preview.png)

## Where it came from

It started as a year-end music ranking: 20 artists compared side by side, with playback-style transitions and each artist's strongest category called out. Once that worked, I stripped out everything domain-specific — what's left is this template.

So it fits any "many objects × many criteria" presentation: product reviews, vendor comparisons, skill radars, game scores. If your data can be written as "each object has a score in each of N dimensions," it works.

## Getting started

Double-click `index.html`. That's it.

A local server works too:

```bash
python -m http.server 8000
```

## Making it yours

**If you don't write code**, read [GUIDE.md](GUIDE.md) (in Chinese). It includes a fill-in-the-blank prompt you can hand to an AI together with your data.

**If you do write code**, read [TUTORIAL.md](TUTORIAL.md) (in Chinese) — architecture, algorithms, the image pipeline, debugging, and the pitfalls.

Almost everything you'd want to change lives in one array; search for `singersRawOrder`. Add or remove rows and you're done — colors and default text are assigned by order, so nothing else needs touching.

| To change | Search for | Notes |
|---|---|---|
| Entry names and scores | `singersRawOrder` | **Also bump `DATA_VERSION`** — see the warning below |
| Dimension names | `dimNames` | Order must match `points` |
| Dimension descriptions | `dimDescriptions` | Same order as above |
| Dimension weights | `rankingWeightPercent` | Must sum to 100 |
| Theme colors | `themePalette` | Picked by order, so renames and edits never misalign them |
| Default achievement text | `achievementDefaults` | Indexed by position |
| Reporting period | `rankingPeriod` | Shown on the intro rules screen |
| Radar scale ceiling | `RADAR_MAX_SCORE` | 10 by default |

> ⚠️ **The one mistake everyone makes**: after editing the initial data in code, change `DATA_VERSION` too. On startup the page compares versions and wipes local data when they differ. Skip it, and your edits get overwritten by whatever scores are already cached in the viewer's browser.

## What's worth knowing

**BEST is computed, not tagged by hand.** On load it scans every entry and marks whichever one holds the highest score in any dimension, with its own transition animation. Ties all get marked — it won't arbitrarily pick one. A dimension where every score is 0 marks nobody. Edit a score in the page and it recalculates immediately.

**The radar chart sizes and positions itself.** Scale and centering are computed per entry — a low-scoring entry draws smaller, a high-scoring one draws larger, and either way it stays centered without clipping the frame. Change one dimension's score and the shape morphs while the chart slides and rescales to match, smoothly rather than snapping.

**Ranking and display are deliberately separate.** Ranking uses only an integer-weighted score (multiply by 100, round, then accumulate), which avoids the float-precision misrankings that are so painful to track down. The displayed total is a different mapping that affects visuals only and never feeds back into ranking — so you can tune the presentation freely without placements shifting.

**Switching images doesn't stutter.** Data URLs are converted to blob URLs once, paired with pre-decoding and an LRU cache, and prefetched during idle time. Cycling through twenty images stays smooth.

**There's a presentation mode.** `Ctrl+Shift+P` hides every management button and leaves only the clean ranking view — handy for recording or screen sharing. Nothing about the ranking itself is disabled.

![Presentation mode](preview-present-mode.png)

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl + E` | Toggle the 6-dimension score editor |
| `Ctrl + Shift + P` | Toggle presentation mode |
| `←` / `→` | Previous / next entry |
| `Space` | Pause / resume |
| `Enter` | Commit edit |
| `Esc` | Cancel edit |

## Where the data lives

Entirely in browser localStorage — nothing is uploaded anywhere. The 「↺ 重置全部」 button clears it.

One thing to know up front: localStorage holds only about **5MB**, and photos fill it fast. That's why cropped results are stored as JPEG (roughly 90KB each at 720×720, under 2MB for twenty) instead of PNG — use the "下载 PNG" button when you need a lossless export. And if a write genuinely doesn't fit, the status line says so rather than pretending it succeeded.

**Photos must be re-added after switching browsers or clearing cache.** Only the mapping from entry to image is stored; the image files themselves stay on your machine.

## Documentation

| Document | For |
|---|---|
| [GUIDE.md](GUIDE.md) | People who don't write code (Chinese) |
| [TUTORIAL.md](TUTORIAL.md) | Developers (Chinese) |
| [ABOUT.md](ABOUT.md) · [ABOUT.en.md](ABOUT.en.md) | A quick overview of scope and trade-offs |
| [README.md](README.md) | 简体中文版 |

## Tests

The ranking and tie-breaking rules have a standalone test — pure logic, no browser needed:

```bash
node test/rank.test.cjs
```

## Requirements

Any reasonably recent Chrome, Edge, Safari, or Firefox. Uses Canvas 2D and ES2020 syntax; `requestIdleCallback` has a `setTimeout` fallback.

## Development

Built collaboratively by GPT-6.1 Sol, DeepSeek V4.1 Flash, and GLM 5.3.

## License

MIT — see [LICENSE](LICENSE).
