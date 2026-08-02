# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 application for displaying Venezuelan ukulele songs with chord diagrams. The app reads songs from markdown files in the `songs/` directory and displays them with interactive chord diagrams and lyrics with chord positioning.

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

1. **Source**: Songs are stored as markdown files in `songs/` directory
2. **Parsing**: `src/lib/songs.ts` uses `gray-matter` to parse frontmatter and content,
   then `parseLeadingNotes()` lifts a `Capo <n>` line and any leading instruction out
   of the body into the metadata. Nothing in `songs/` is edited for it; the parse is
   deliberately conservative and leaves anything that looks aligned in the sheet
3. **Rendering**: Components consume `ParsedSong` objects with metadata and chord definitions

### Key Components

- **SongList** (`src/components/SongList.tsx`): Client component with filtering (search, key, artist) and table display
- **LyricsDisplay** (`src/components/LyricsDisplay.tsx`): Parses `[ChordName]` notation and positions chords above lyrics
- **ChordDiagram** (`src/components/ChordDiagram.tsx`): SVG-based ukulele chord diagrams using 4-digit position strings (GCEA)

**`LyricsDisplay` is the most sensitive code in the app.** A chord moved one syllable
to the left looks correct and plays wrong, and nothing automated catches it:
`pnpm validate` reads the source Markdown and never looks at the screen, and since M6
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
- `SongMetadata`: Frontmatter data (title, artist, year, key, timeSignature, chords)
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

Songs are markdown files with YAML frontmatter:

```yaml
---
title: Song Title
artist: Artist Name
year: 2020
key: C
timeSignature: 4/4
chords:
  - name: C
    positions: "0003"
  - name: G
    positions: "0232"
---
```

### Chord Notation

In lyrics, chords are marked with square brackets at the position they should be played:

```
[C]Verse line starts here
This is a line with a [G]chord in the [Am]middle
```

#### Spacing Between Consecutive Chords in Lyrics

When two chords appear consecutively without enough natural spacing between them, additional spacing is required for visual alignment:

**Rule 1: Two chords directly together (no characters between)**
Add (N + 1) spaces between the chords, where N = number of letters in the first chord:

```
❌ Incorrect: sin ti[Em] [A7]
✓ Correct:   sin ti[Em]   [A7]
             (Em has 2 letters → 2+1 = 3 spaces total)
```

**Rule 2: Chord followed by character(s) then another chord**
Add N spaces after the character(s), where N = number of letters in the first chord:

```
❌ Incorrect: dónd[Bm]e [A]fue
✓ Correct:   dónd[Bm]e  [A]fue
             (Bm has 2 letters, 1 char 'e' + 2 spaces)

❌ Incorrect: Empezand[Gm7]o [A]seguro
✓ Correct:   Empezand[Gm7]o    [A]seguro
             (Gm7 has 3 letters, 1 char 'o' + 3 spaces)
```

**Note**: This rule only applies when chords are close together. If chords already have sufficient natural spacing from lyrics text, no additional spacing is needed.

### Chord Position Format

Positions are 4-digit strings representing fret positions for ukulele strings GCEA (low to high):
- `"0003"` = G:open, C:open, E:open, A:3rd fret (C chord)
- `"2210"` = G:2nd, C:2nd, E:1st, A:open (Dm chord)

### Strumming Patterns (Instrumental Parts)

For instrumental sections without lyrics, chords must be formatted with proper spacing for readability:

**Rule 1: Simple chord sequences**
When chords are written together, add a middle dot `·` after each chord followed by spaces equal to the number of letters in the chord name:

```
❌ Incorrect: [G] [F] [Am] [Cm]
✓ Correct:   [G]· [F]· [Am]·  [Cm]·
```

**Rule 2: Strumming patterns with time signatures**
When strumming patterns follow the song's time signature (separated by `|`), apply the same spacing rule:

```
❌ Incorrect: [D] · · · | [Bm] · · ·
              [G] · [F#m] · | [Em] · [A]↓ ·

✓ Correct:   [D]· · · · | [Bm]·  · · ·
             [G]· · [F#m]·   · | [Em]·  · [A]↓ ·
```

**Exception**: If a chord already has a character immediately after it (like `↓`, `↑`, or other strumming indicators), do not add the middle dot. However, you still need to add the spacing (N spaces where N = number of letters in chord) after the strumming indicator.

Examples with strumming indicators:
- `[Dm]↓  ◦` (2 letters → 2 spaces after ↓)
- `[Cmaj7]↓     ·` (5 letters → 5 spaces after ↓)
- `[A]↓ ·` (1 letter → 1 space after ↓)

This spacing ensures:
- Visual alignment of beats in the strumming pattern
- Readability when chords have different name lengths
- Consistent formatting across all song files

### Checking a song

`pnpm validate` reads every file in `songs/` and reports:

- **errors** — frontmatter missing a required field, a `positions` string that is not
  four digits, a `[Chord]` used but never defined, a filename that is not the title's
  slug, a chord spanning more than four frets, a Cyrillic character anywhere in the file.
  These break the app, and the command exits non-zero.
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
read **276 songs checked against the book, 0 disagreeing**. That number cannot be produced
again, so the spec is now what the collection is measured against.

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
