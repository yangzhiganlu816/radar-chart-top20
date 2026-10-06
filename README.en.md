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
| Dimension names | `dimNames` | Order must match `points`; you can also edit them right on the page, see below |
| Dimension descriptions | `dimDescriptions` | Same order as above |
| Dimension weights | `rankingWeightPercent` | Must sum to 100 |
| Theme colors | `themePalette` | Picked by order, so renames and edits never misalign them |
| Default achievement text | `achievementDefaults` | Indexed by position |
| Reporting period | `rankingPeriod` | Shown on the intro rules screen |
| Radar scale ceiling | `RADAR_MAX_SCORE` | 10 by default |

> ⚠️ **The one mistake everyone makes**: after editing the initial data in code, change `DATA_VERSION` too. On startup the page compares versions and wipes local data when they differ. Skip it, and your edits get overwritten by whatever scores are already cached in the viewer's browser.

### Dimension names are editable in place

No code needed. Each dimension label on the chart has two layers: **the name on top, the score below**. Click either one to edit it right there — same interaction as editing a score, so Enter or clicking away saves, Esc cancels.

Hovering turns the cursor into a pointer and adds an underline to show which layer you're on. After a rename, three places update together: the chart label, the intro rules screen, and the `Ctrl+E` panel. Changes are stored in the browser and survive a reload; 「↺ 重置全部」 resets them.

One caveat: **this renames, it doesn't redefine**. The explanatory line under each dimension (`dimDescriptions`) stays put — that's the "what does this dimension measure" text, and changing it means editing the code.

### Photos are matched by filename

Entry photos aren't written into the code. You load them through the 📷 button, and they're **matched to entries by filename**. The rule: after stripping the extension, the filename has to match the entry name.

- `Item1.jpg` → matches "Item1"
- `Item1 (1).jpg` → **won't match**
- `Item1 .jpg` → fine, spaces are ignored when matching

You can select a whole folder to load them in bulk; anything that doesn't match is skipped. To fine-tune a single photo (zoom, horizontal and vertical position), use the crop panel — output is a 720×720 square.

Photos live only in your own browser. They're never written into the code and never uploaded.

## What's worth knowing

### BEST is computed, but the rules are explicit

On load it scans everything once. There's exactly one condition: **an entry's score in any dimension equals the highest score in that dimension.** Meet it, and that entry gets the BEST badge plus its own transition animation.

A few edge cases worth knowing up front:

- **Ties all count.** Two entries tied for the top in a dimension both get BEST — it won't arbitrarily pick one by order.
- **An all-zero dimension marks nobody.** Otherwise a dozen BEST badges would appear at once.
- **Single dimensions only, never totals.** An entry with a high total but no first place anywhere gets nothing.
- **It follows your edits.** Change a score on the page and it recalculates immediately, no reload needed.

### The radar chart sizes and positions itself

Scale and centering are computed per entry in real time: it takes the data polygon's vertices together with the surrounding text labels, derives a bounding box, solves for the largest scale that still fits inside the canvas, then translates the chart so that bounding box ends up centered. The result never clips the frame or shrinks into a corner.

One thing that's easy to misread: **the drawn radius is not a linear fraction of the score.** The mid-to-low range expands faster, and everything above 8.5 gets stretched further so gaps at the top stand out more. That mapping only affects the drawn radius — it never touches the scores or the ranking.

Switching entries or editing scores animates both scale and position smoothly, never snapping.

### Ranking and display are deliberately separate

Ranking uses only an **integer-weighted score**: each dimension's score is multiplied by 100, rounded, then weighted and accumulated. The rounding step eliminates float error — otherwise you get the "mathematically equal but the program disagrees" kind of misranking, which is miserable to debug. Ties use standard competition ranking (1, 2, 2, 4).

The displayed total is a different three-segment linear mapping that stretches the slope above 8.5. **That mapping never feeds into ranking**, so you can tune the visuals freely without placements shifting.

### Switching images doesn't stutter

Data URLs are converted to blob URLs once, paired with pre-decoding and an LRU cache, and prefetched during idle time. Cycling through twenty images stays smooth.

### There's a presentation mode

`Ctrl+Shift+P` hides every management button and leaves only the clean ranking view — handy for recording or screen sharing. Nothing about the ranking itself is disabled.

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

Scores, achievement text, and photos all live in browser localStorage — **nothing is uploaded anywhere**. The 「↺ 重置全部」 button clears it.

The keys, in case you need to inspect them manually:

| Key | Contents |
|---|---|
| `radarChart_points` | Per-entry scores |
| `radarChart_dimNames` | Custom dimension names |
| `radarChart_honors` | Per-entry achievement text |
| `radarChart_achievements` | Editable achievements |
| `radarChart_portraits` | Entry card photos |
| `radarChart_best_photos` | BEST transition photos |
| `radarChart_best_backgrounds` | BEST background images |
| `radarChart_presentMode` | Presentation mode on/off |

### The storage limit is about 5MB

That's a hard limit of localStorage, and it's worth knowing in advance because **photos are what fill it up**.

Cropped results are stored as **JPEG** — roughly 90KB each at 720×720, under 2MB for twenty. That's plenty for normal use. PNG was the original choice and had to go: at the same size a single PNG runs about 800KB, so twenty would come to 16MB, and **writing the 8th one already failed in testing**. Use the "下载 PNG" button in the panel when you need a lossless export; that path is unaffected.

**If it does fill up**, the status line says explicitly that the save failed and reports current usage — it won't pretend otherwise. What to do, in order:

1. Hit "下载 PNG" to export the current photo to your computer first, so you don't lose it
2. Use "恢复默认照片" in the photo panel to clear a few you don't need
3. Re-upload

If you genuinely need many large images, use external image URLs or split the demo across several files. localStorage is not an image store.

### Moving to another machine means re-adding photos

**Photos need to be reloaded after switching browsers or clearing cache.** Only the mapping from entry to image is stored — the image files themselves stay on your disk. That's also why they cost nothing in repo size and never leave your machine.

### ⚠️ On `file://`, multiple copies share one storage

This one matters if you keep several copies around locally — say, two rankings on different themes.

Browsers treat **every** `file://` page as the same origin, sharing a single localStorage. Confirmed by testing: data written on one file's page was still readable after navigating to a file in a completely different directory. So the two rankings will overwrite each other's data — and if their `DATA_VERSION` values differ, opening one will wipe the other's data outright.

Two safe options:

- **Keep only one copy in use** and archive the rest
- **Serve them locally**, giving each copy its own port:

```bash
cd your-project-folder
python -m http.server 8000
```

Different ports are different origins, so the data stays separate. It also sidesteps assorted other browser restrictions on local files.

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
