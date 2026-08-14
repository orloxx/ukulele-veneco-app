# Changelog

Every release, newest first — one entry per tag on `main`. The entry is written in the
release commit, beside the `package.json` bump. This file is the index, not the story:
the detail lives in the issues and decisions each entry cites and in `git log`.

## 2.11.0 — 2026-08-10

*Guardar todas* becomes a button in the filter row, at every width, naming and counting
the action — below 640px the table has no `thead`, so the header checkbox had never
existed on a phone and `2.10.0` had given it a dialog no phone could reach. The header
checkbox is deleted, and the 276 row checkboxes adopt `SaveOfflineButton`'s arrow/tick
pair (DECISIONS 37).

## 2.10.0 — 2026-08-10

The `/list` header checkbox gets quieter and slower: the *GUARDAR* column title comes
off, and above six songs the box opens a native `<dialog>` naming the number it is about
to save — the only control in the app that asks, because its mis-tap means 276 boxes.
Un-saving stays unguarded on purpose (DECISIONS 36).

## 2.9.2 — 2026-08-10

BUG-016: the book's second-voicing markers (`Em7^`, `E²`, `C#m²`) read as part of the
chord's quality, making three songs untransposable. `stripVoicingMarker` takes the
marker off wherever the collection is asked something; it still travels where the song's
own diagram travels (the cuatro's `printed+2` draws the book's page). The same fix found
`check-difficulty.mjs` running green over zero pairs — now 5292.

## 2.9.1 — 2026-08-10

BUG-020: the M16 empty state had never been laid out as its own CSS said — both rules
lost on specificity, so the message sat off-centre in a one-row box. The seventh bug
Iker found by using the app rather than building it (the release note says fifth, which
is wrong and not worth a force push).

## 2.9.0 — 2026-08-09

M16 — *Guardadas* is the fifth filter on `/list`, composing with the other four; the
smallest milestone by diff (two files) because M13's `SongFiltersContext` had left its
seat ready. The real work was the three-way empty state (DECISIONS 34 declined a pinned
second table).

## 2.8.0 — 2026-08-06

The first release that takes something away: the cuatro's 4th string corrected to A3
(220 Hz, not 440 — and nothing else moved, because every M15 claim is about pitch
classes, now asserted rather than believed), and the ukulele's tuning picker deleted
with its caveat — each instrument states exactly the tuning its chord names are true of
(DECISIONS 33).

## 2.7.1 — 2026-08-05

The tuner's caveat completes itself: A D F♯ B *is* the cuatro's tuning, so it says one
press of the toggle makes the names true. Found by Iker reading the M15 verification
checklist — a checklist can find a defect without being run. (Deleted entirely by
`2.8.0`.)

## 2.7.0 — 2026-08-05

M15 — ukulele or cuatro: the reader picks the instrument once and every diagram in the
app is drawn for it — sheet, `/song/<slug>/acordes` and `/afinador`. Not a second
transcription: the tuning relation makes the cuatro diagram for X the book's own diagram
for X−2 — 236 songs in the printed key, all 276 at printed+2, not one fingering invented
(DECISIONS 31/32).

## 2.6.4 — 2026-08-04

BUG-019: twenty fingerings across thirteen songs were missing the strings a barre
covers — the extractor counted dots and the book draws a barre as a line. The circular
`--verify` had passed all twenty for twenty-three releases; the replacement holds each
fingering against its own name and shares nothing with what wrote the data
(DECISIONS 30: a check may not be made of the thing it checks).

## 2.6.3 — 2026-08-04

BUG-018: two song pages referenced a later upload instead of the recording the sheet
was transcribed from — two lines of `data/videos.json`, no code, plus a guard so the
matcher cannot silently revert them (DECISIONS 29).

## 2.6.2 — 2026-08-03

M12 — migrate to Serwist: `next-pwa` is gone, `sw.ts` is source, `/afinador` is a real
precache entry and `warmTunerPage()` is deleted (DECISIONS 28). The seventh caching
rule existed only in the built worker — `next-pwa`'s own `start-url` route — and is
carried; `precachePrerendered: true` would have downloaded all 555 pages on install.
Verified on songs saved by the old build, opened under the new worker with the server
dead.

## 2.6.1 — 2026-08-02

BUG-017: the four `/list` filters lived in state inside the page, so opening a song and
pressing *Volver* reset them. They live in the shared layout's provider now — nothing
restores them because nothing unmounts them. The URL lost on measured grounds, recorded
in the provider's doc comment.

## 2.6.0 — 2026-08-02

M14 — a collapsed YouTube reference under the song head on 261 of 276 pages; the app's
first third-party request ever, confined to a reader who expands (iframe mounted on
expand, no poster, zero Google requests while collapsed — DECISIONS 24/25). Each entry
prints the evidence it was matched on; `M14 · 5` was declined, so the reader is the
whole verification mechanism (DECISIONS 27).

## 2.5.0 — 2026-08-02

M13 — difficulty in the list: every row carries its chord count, tinted by band, with
fácil/media/difícil chips (87/129/60). The book's own criterion, derived not stored;
weighting hard shapes flags 208 of 276 songs and separates nothing (DECISIONS 23).

## 2.4.0 — 2026-08-02

M11 — a Tono control on every song page offering the keys the song can actually be
played in, remembered per song; sheet, lyric, chord panel and `/acordes` move together.
The hard part was spelling, not vocabulary: the conventional rule asks for names the
book never writes 562 times (DECISIONS 21).

## 2.3.2 — 2026-08-02

BUG-015: the tuner's verdict came off the raw reading and the figure was rounded for
display, so −5.4¢ showed −5 and read *flat* on a ±5 screen — rounding once is the fix.
And the landing links the tuner at last (`M10 · 7`): it renders its own header, so the
gauge had been missing from the first screen anybody sees.

## 2.3.1 — 2026-08-02

The tuner holds the screen awake (four strings outlast a phone's dim timer) and holds
the last reading, marked held, instead of blanking the moment the string dies — a
correct principle applied one case too wide, caught by tuning a real instrument.

## 2.3.0 — 2026-08-02

M10 — `/afinador`: microphone in, note, cents and peg direction out, four tunings,
reached from the header everywhere. The detector picks the first autocorrelation peak
over a threshold, not the tallest — 0.051¢ worst case on plucks where max-picking reads
the octave below on 7 of 10. Warmed into the cache by the app shell, with a control
against Next's own prefetch (DECISIONS 20).

## 2.2.0 — 2026-08-02

M9 — auto-scroll: play button and speed slider in a sticky bar, pace in lines of lyric
per minute, remembered per song (`localStorage`, DECISIONS 18), phone held awake;
ignores `prefers-reduced-motion` deliberately (DECISIONS 19). The sub-pixel accumulator
is measured: per-frame `scrollBy` at the same pace moves zero pixels in 361 frames.

## 2.1.1 — 2026-08-01

BUG-013 (the saving spinner drew around a still-visible checkbox) and BUG-014 (focusing
any filter field zoomed the page on iOS — true since M7, tripled by the combobox row;
the price of leaving the platform's `<select>`).

## 2.1.0 — 2026-08-01

M8 — `/list` says which song is saving (a ring per row in flight), the bulk save is a
pool of six where the report is the row itself, and both filters are hand-built
comboboxes you type at (DECISIONS 17; 181 distinct artist credits, not 478).

## 2.0.4 — 2026-07-31

BUG-009–BUG-012, found by Iker using the finished app: the landing's lede claimed the
whole repertoire is played on cuatro (rewritten in his words), the save column titled
and its checkboxes named *Guardar*/*Quitar*, and page width unified over `--gutter-page`
— the width token had drifted anyway because the inset beside it was copied five times
with three answers (DECISIONS 16).

## 2.0.3 — 2026-07-31

`M8 · 1` — the hero badge, cut from Iker's redrawn art: masked at full resolution and
then scaled (sharp composites after it resizes), checked by reading the alpha channel
rather than looking at it on a white page.

## 2.0.2 — 2026-07-31

M6 — the source PDF and its extractor are deleted, the book 404s on the live site, and
the Ciro Durán credit is checked by `pnpm build` (DECISIONS 14/15) — a check nobody
runs is a check that does not exist, and there is no CI here. Confirmed with Ciro Durán
the same day (DECISIONS 1).

## 2.0.1 — 2026-07-31

BUG-008: the save checkbox now fills the service worker's cache — it had only ever
written IndexedDB, which nothing reads to render, so a saved song did not open offline
and an unsaved one did. The automated check had passed by saving a song whose page it
had just visited.

## 2.0.0 — 2026-07-31

M7 — the app's whole visible surface, designed for the first time; the design system
lives in `globals.css`, nothing to sync (DECISIONS 12/13). Building it found BUG-007:
the service worker had never registered on any device since December 2025 — `next-pwa`
wires registration into the Pages Router entry, and every page here loads
`main-app.js`. A file returning 200 proves it was written, not that any browser asked
for it.

## 1.7.0 — 2026-07-31

M5 — the last 52 songs. **The migration is finished**: all 276 songs in `songs/`, page
1 to page 277, every one prerendered as a sheet and a chord page.

## 1.6.0 — 2026-07-31

M4 — 70 more songs (pages 155–224).

## 1.5.0 — 2026-07-31

M3 — 75 more songs (pages 80–154). Page 102's split verses rejoined on the `y`
coordinate; the Cyrillic `е` ban enters `pnpm validate` (DECISIONS 11).

## 1.4.0 — 2026-07-31

A parenthesised chord — the book's anticipation mark, answered as `M2 · 8` (DECISIONS
9) — now floats above its syllable in muted grey, keeping the brackets so it reads as
*optional*. `pnpm validate` warns when a `(X)` is not followed by `[X]`.

## 1.3.0 — 2026-07-31

`M2 · 3`–`6` — 44 songs in one go, pages 36–79, finishing M2's transcription. BUG-005
(a lyric line read as a diagram label — caught by both checks, unlike its mirror) fixed
with a measured 15pt tolerance; BUG-006 (a Cyrillic `е` in `volare.md`) shipped in this
release and was caught at M5.

## 1.2.0 — 2026-07-31

`M2 · 2` — pages 25–35. The capo is kept, not dropped — 51 of 277 pages print one
(DECISIONS 7) — and BUG-004 (chord-diagram labels leaking into song text on 16 pages,
past both checks) fixed at the source.

## 1.1.0 — 2026-07-31

`M2 · 1` — eleven songs, pages 14–24. Beat dots are copied exactly as set; page 14 is
the Spanish lyric of page 13's song, kept as two files.

## 1.0.2 — 2026-07-31

BUG-001 (chord diagrams dropped any string above the 4th fret — the window now slides
up the neck and prints the starting fret, as the book does) and BUG-002.

## 1.0.1 — 2026-07-31

M1 — the transcription tooling, dependency-free node commands: the extractor (written
to die with the PDF, and it did, at M6), `pnpm validate` over every file in `songs/`,
and the first thirteen songs aligned with DECISIONS 6 — fingerings follow the book,
per song, not per chord name.

## 1.0.0 — 2025-12-21

The PWA: installable, with the service worker that — as BUG-007 established seven
months later — never actually registered.

## 0.1.0 — 2025-12-20

The app before any of this: the hand-kept song list as it stood.
