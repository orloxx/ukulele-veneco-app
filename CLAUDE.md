# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 application for displaying Venezuelan ukulele songs with chord diagrams. The app reads songs from [ChordPro](https://www.chordpro.org) files in the `songs/` directory and displays them with interactive chord diagrams and lyrics with chord positioning.

This project follows a **mobile-first** and **offline-first** approach, prioritizing mobile user experience and ensuring functionality without network connectivity.

## Development Commands

This project uses `pnpm`. Never `npm` or `yarn`.

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Run linter and auto-fix issues
pnpm run lint

# Format code
pnpm run format

# Check every song in songs/ against the format spec
pnpm run validate

# Check the attribution is still everywhere it has to be
pnpm run credits

# Run the transposer over all 276 songs and every key it offers
pnpm run transpose

# Check the difficulty band rule, and print the chord-count distribution
pnpm run difficulty

# Check data/videos.json against songs/
pnpm run videos
```

`pnpm lint` deliberately does **not** run `pnpm validate`. Biome's subject is the code;
the validator's subject is the content, it never rewrites a file, and it is the last step
before committing a song rather than something to run while editing a component.

**There are six checks because they have six subjects** — the code, the song format, the
attribution, the transposer, the band rule, and the video map. **Two of them run inside
`pnpm build`, and which two is the interesting part.** There is no CI here, so the build is
the only check that cannot be forgotten, and the test for joining it is whether a check can
fail for a reason that is **not** a defect. `pnpm credits` and `pnpm videos` cannot, so they
are wired in. `pnpm transpose` can and is meant to: it asserts the collection's exact reach,
so adding one song to `songs/` fails it on purpose. That is a tripwire in a command you run
and an outage in one the deploy runs.

## Architecture

### Song Data Flow

1. **Source**: Songs are ChordPro files — `songs/<slug>.cho` — since M18
2. **Parsing**: `src/lib/chordpro.ts` splits a file into its directives and its sheet;
   `src/lib/songs.ts` maps those directives onto `SongMetadata`. Every field had a
   directive the standard already defines, which is what made M18 a copy rather than a
   redesign
3. **Rendering**: Components consume `ParsedSong` objects with metadata and chord definitions

**`LyricsDisplay` never learned ChordPro, and that is deliberate.** A section directive
becomes the `## <label>` line the sheet has drawn as a heading since M7, inside the
parser — so the marker is an internal shape rather than a file format, and the most
sensitive component in the app was not opened in order to change a file format.

### Key Components

- **SongList** (`src/components/SongList.tsx`): Client component with filtering (search, key, artist) and table display
- **LyricsDisplay** (`src/components/LyricsDisplay.tsx`): Parses `[ChordName]` notation and positions chords above lyrics
- **ChordDiagram** (`src/components/ChordDiagram.tsx`): SVG-based ukulele chord diagrams using 4-digit position strings (GCEA)

**`LyricsDisplay` is the most sensitive code in the app.** A chord moved one syllable
to the left looks correct and plays wrong, and nothing automated catches it:
`pnpm validate` reads the source file and never looks at the screen, and since M6
there is no second check at all — the one that held every fingering up against the
printed book went with the book. Two things hold a chord in place and
they are a pair: it is attached to the text that *follows* it and positioned at
`bottom: 100%` of that text's box, and the room it needs is reserved as
`padding-top` **and** `row-gap` on the line — the row-gap is what stops a wrapped
line, which on a phone is most of them, dropping the second row's chords onto the
first row's words.

### Routes

- `/` — the landing page. Marketing rather than tool, and the only screen with
  display type, a full-colour band and an image
- `/list` — the catalogue: a filterable table, server-rendered, filtered client-side
- `/song/[slug]` — the song sheet: lyrics with chords over their syllables, and the
  chord panel (static generation)
- `/song/[slug]/acordes` — every chord in the song drawn large, with the explainer.
  Same `generateStaticParams` as the sheet
- `src/app/not-found.tsx` — one 404 for the whole app. Both song routes set
  `dynamicParams = false`, so an unknown slug is served this page statically
  rather than booting a render just to throw

### Type System

Core types in `src/types/song.ts`:
- `SongMetadata`: the masthead (title, artist, year, key, timeSignature, chords) plus
  `capo` and `notes`, each from its own directive
- `Chord`: Chord definition with name and 4-digit positions string (e.g., "0003" for C)
- `ParsedSong`: Complete song data including slug, metadata, lyrics, and chordDefinitions
- `SongVideo`: a reference recording, and **deliberately not a field on `SongMetadata`** —
  every field there comes off the book's page and a YouTube ID does not. See its doc
  comment and `data/README.md`

### `songs/` is the book, `data/` is not

`songs/` is the cancionero, and since M6 deleted the source PDF it is the *record* rather
than a copy of one — `songs/README.md` says a fingering in a file **is** the source.
`data/` is the sibling directory for what the app knows that the book never printed, and
it holds one file: `data/videos.json`, a slug → reference-recording map.

`src/lib/videos.ts` is its only reader, the way `src/lib/songs.ts` is the only reader of
`songs/`. It is server-only, which is the boundary rather than a convention: `/list` hands
all 276 songs' metadata to a client component, so a video field on `SongMetadata` would
ship 276 references in a payload no row draws. A song page gets `getSongVideo(slug)` — its
own entry — as a prop.

## Song File Format

**Songs are [ChordPro](https://www.chordpro.org), and the format is not this project's.**
`songs/README.md` is the reference for everything ChordPro does not say — the fingering
rule, the coined names, the anticipation mark, the beat dots, the spacing that keeps a
chord over its syllable — and it is the file to read before touching `songs/`.

```
{title: Barlovento}
{artist: Aldemaro Romero}
{year: 1950}
{key: Dm}
{time: 6/8}

{define: Dm base-fret 1 frets 2 2 1 0}
{define: C base-fret 1 frets 0 0 0 3}

{start_of_verse: Intro}
[Dm]· · · | [C]· · ·
{end_of_verse}
```

Thirteen directives, listed in `songs/README.md` and enforced by `pnpm validate`: an
unrecognised one is an error, because it is far more often a typo than a feature. **No
short forms** — `{t:}`, `{soc}` and the rest are legal ChordPro and are not written here.

`{define:}` carries the same four GCEA frets `songs/` always held, written ChordPro's way:
`base-fret` names the top fret of the diagram and `frets` counts from it, so a shape inside
the first four frets sits at `base-fret 1` and its numbers are the absolute frets.
`src/lib/chordpro.ts` converts between the two, and it is the only place that does.

### Checking a song

`pnpm validate` reads every file in `songs/` and reports:

- **errors** — a missing `{title:}`, `{artist:}`, `{key:}` or `{time:}`, a malformed
  `{define:}`, a directive this collection does not write, a section that is never closed,
  a `[Chord]` used but never defined, a filename that is not the title's slug, a chord
  spanning more than four frets, a Cyrillic character anywhere in the file. These break the
  app, and the command exits non-zero.
- **warnings** — a chord defined but never used, spacing that does not match the rules in
  `songs/README.md`. These do not fail the run.

**A high fret is fine; a wide one is not.** `ChordDiagram` slides its four-fret window up
the neck to wherever the chord sits and prints the starting fret beside the grid, so `Ab`
= `5343` draws correctly. What it cannot show is a shape spread over more than four frets
— and no chord in the cancionero is, so one in a song file means the transcription is
wrong.

The spacing warnings are worth taking seriously even though they are only warnings: the
app positions each chord absolutely above monospaced lyrics, so the spaces after a chord
are what stop the next chord from landing on top of it.

**The collection's own number is `276 songs, 0 errors, 18 warnings`, and the 18 are meant
to stay.** Twelve are *defined but never used*: the cancionero prints a diagram for a chord
the arrangement then does not reach, and dropping it would edit the book. The other six are
all in `aun.md`, whose chords sit over a TAB staff — that is the right alignment being
reported as the wrong one. Do not "fix" a warning into breaking a song;
`songs/README.md` names the files that carry an alignment the rules cannot describe.

**`pnpm validate` is now the only check there is.** Until M6 there was a second one that
diffed every song's fingerings against the printed diagram it was copied from; it needed
the book, and the book is gone. See below.

## The cancionero is not in the repo, and there is no longer a copy to read

All 276 songs are transcribed. At M6 the source PDF and the `scripts/extract-page.mjs`
that read it were both deleted, having nothing left to do: `songs/` **is** the cancionero
now, as far as this project is concerned.

**Do not put the PDF back.** The reason is not that the extractor is gone — it is that
`public/` is served verbatim by Vercel, so a copy in there publishes the whole book at a
guessable URL, and this repo is public, so a commit would keep publishing it long after
the file was deleted. That is why `/public/*.pdf` stays in `.gitignore`, and the entry
outlives the workflow that prompted it. If you want the book for yourself, download it
from [elukulelevene.co](https://elukulelevene.co) and keep it outside the working tree.

**What the book knew about `songs/` is written down in `songs/README.md`** — the fingering
rule, the anticipation mark, the notes above a song, the conventions the cancionero used
that the files still carry. Moving it there was the point of the milestone. The last run
of the check that could compare the two, taken immediately before the PDF was deleted,
read **276 songs checked against the book, 0 disagreeing** — and **that number did not
mean what it looks like it means, which is BUG-019**. `songs/` was written *by* the
extractor, and `--verify` compared it against the extractor reading the same pages again,
so the two agreed on everything the reader was consistently wrong about. It was a check
that nobody had hand-edited a fingering, presented as a check that the fingerings were
the book's.

**What it was consistently wrong about was barres.** The book draws one as a dot at each
end of the bar joined by a line — and the line is a stroke where the reader only counted
filled dots, so it kept both ends and silently dropped every string in between. Twenty
diagrams across thirteen songs came out with an interior string open: `Db` as `1014` where
the page draws `1114`, `C#m7` as `4004` where it draws `4444`. Iker found the first one by
playing `cancion-suave` on 2026-08-04, twenty-three of them later than the check that was
supposed to catch it.

**So the lesson is about the shape of the check, not the arithmetic.** A verification whose
two sides come from one implementation cannot see that implementation's blind spot, and
will report zero for ever. The guard that replaced it is in `scripts/check-transpose.mjs`
and deliberately does not resemble it: it holds each fingering against **its own name**
rather than against a re-reading of the source, so it shares nothing with whatever produced
the data. It would have caught fifteen of the twenty on the day they were written.

**The credit is not optional and does not come out.** The cancionero is Ciro Durán's work,
used with his permission on the single condition that he is credited — vault
`DECISIONS.md` 1. It appears in `README.md`, `LICENSE`, `CONTRIBUTING.md`, the
`package.json` description, `src/app/layout.tsx`'s metadata, the landing hero and footer,
the 404, and `Footer.tsx` — the last four through `EXTERNAL_URLS` / `SITE_INFO` in
`src/lib/constants.ts`, which says so at the definitions.

**`pnpm credits` is the guard**, and `pnpm build` runs it, so a deploy fails rather than
ships without the attribution. It checks the sources *and* the rendered pages, which is
the half that matters: what puts the credit on a song page is `<Footer />` in
`src/app/(app)/layout.tsx`, so a refactor can lose it on 276 pages without touching a
single one of the strings above.

## Path Aliases

- `@/*` maps to `src/*` (configured in tsconfig.json)

## Code Style

- Uses Biome for linting and formatting
- TypeScript strict mode enabled
- Tailwind CSS v4 for styling

## The design system

**`src/app/globals.css` is the design system.** It was designed outside the repo
and landed here at M7; there is no upstream, nothing is vendored, and there is no
sync to keep running. Edit that file. Read its header before writing any new
screen — three rules in it are the ones that will rot first, because a grep of
the existing code will not teach you any of them:

1. **Product code uses the semantic aliases, never a ramp step.** `--action-primary`,
   `--sheet-chord`, `--text-muted` — not `--turquesa-600`. This is the only reason
   the dark theme is one block of overrides instead of an audit of every component.
   The aliases are also Tailwind utilities (`bg-surface-page`, `text-sheet-chord`)
   via `@theme inline`; a ramp step deliberately has no utility.
2. **Monospace never appears outside a song sheet, a chord name, a tono or a
   compás** — plus the landing's counted figures, which the system sanctions and
   nothing else does.
3. **No emoji anywhere in the interface.** If a UI needs a symbol it needs an icon
   from `src/components/icons.tsx`, which inlines Phosphor paths so the PWA has
   no icon dependency to cache.

Components are styled with the `uv-*` class layer in that file plus Tailwind
utilities for layout. `--radius-xs` through `--radius-xl` deliberately reuse
Tailwind's own theme variable names, so `rounded-md` means 10px without a second
vocabulary.

**The song sheet has no zoom control, and `--sheet-scale` is not in the token
layer.** The design prototype ships one, so this gets re-proposed; the reason it
is not built is at the call site in `LyricsDisplay.tsx`.

**`ServiceWorker.tsx` is not redundant with `register: true` in
`next.config.ts`.** That setting is broken for the App Router — see BUG-007.
