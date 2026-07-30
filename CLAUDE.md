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
```

`pnpm lint` deliberately does **not** run `pnpm validate`. Biome's subject is the code;
the validator's subject is the content, it never rewrites a file, and it is the last step
before committing a song rather than something to run while editing a component.

## Architecture

### Song Data Flow

1. **Source**: Songs are stored as markdown files in `songs/` directory
2. **Parsing**: `src/lib/songs.ts` uses `gray-matter` to parse frontmatter and content
3. **Rendering**: Components consume `ParsedSong` objects with metadata and chord definitions

### Key Components

- **SongList** (`src/components/SongList.tsx`): Client component with filtering (search, key, artist) and table display
- **LyricsDisplay** (`src/components/LyricsDisplay.tsx`): Parses `[ChordName]` notation and positions chords above lyrics
- **ChordDiagram** (`src/components/ChordDiagram.tsx`): SVG-based ukulele chord diagrams using 4-digit position strings (GCEA)

### Routes

- `/` - Home page with filterable song list
- `/song/[slug]` - Individual song page with lyrics and chord diagrams (static generation)

### Type System

Core types in `src/types/song.ts`:
- `SongMetadata`: Frontmatter data (title, artist, year, key, timeSignature, chords)
- `Chord`: Chord definition with name and 4-digit positions string (e.g., "0003" for C)
- `ParsedSong`: Complete song data including slug, metadata, lyrics, and chordDefinitions

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

## Transcribing a song from the cancionero

Most of the work left on this project is one job: getting the rest of Ciro Durán's
songbook out of `public/elukuleleveneco_2025_web.pdf` and into `songs/`. It is a loop,
and it is the same loop every time.

```bash
node scripts/extract-page.mjs 14        # 1. read the book page
$EDITOR songs/quinta-anauco.md          # 2. write the song file
pnpm validate                           # 3. check it
git commit                              # 4. commit it
```

**Songs are transcribed in the book's own order, starting from page 1.** That is a
decision, not a habit: it makes progress a single number instead of a set difference.
`ls songs/*.md | wc -l` is the last page transcribed — with one correction, below.

### 1. Read the page

`scripts/extract-page.mjs` prints one book page as text. It needs nothing installed: it
resolves the page through the PDF's page tree, decodes the subset fonts through their own
`/ToUnicode` tables, and reads the chord diagrams off the vector art, so a page comes back
as frontmatter you can paste plus lyrics already in `[Chord]` notation.

```bash
node scripts/extract-page.mjs 14          # book page 14, as text
node scripts/extract-page.mjs 14 --json   # the same, structured
node scripts/extract-page.mjs --check     # read all 277 pages and self-check
```

The page number is the **printed** one, not the PDF's — page 1 of the book is the 24th
page of the file. The script refuses to print a page whose printed footer disagrees with
the page it was asked for, so a silently-off-by-something mapping cannot reach a song
file. `--check` proves the mapping over the whole book in one go.

What it will not do for you:

- **Section headings.** The book sets *Intro*, *Coro*, *Puente* in bold; the extractor
  prints them as plain lines and you turn them into `## Coro`.
- **The spacing rules.** The extractor reproduces the book's own spacing. The rules in
  `songs/README.md` are what the app needs, and they are not the same thing.
- **`year`.** The credit line reads `Artist (Composers, 1966)`; the year is the one in
  the parentheses, and the artist is the part before them.
- **`capo`.** Some pages print a capo fret. The song format has no field for it, so the
  extractor emits it as a comment and it is dropped. See the vault ROADMAP's backlog.

### 2. Watch for these

- **Page 197 has no song of its own.** *La Muerte del Rucio Moro* runs across pages 196
  and 197, the only song in the book that does. So there are **277 numbered pages and 276
  songs**, and past page 197 the progress count is one behind the page number:
  `ls songs/*.md | wc -l` + 1 is the next page to transcribe.
- **Three pages are set in two columns** (102, 196, 197). The extractor prints the left
  column and then the right, and says so at the top. Read them in that order.
- **Two songs share a title.** Sentimiento Muerto's *Sin sombra no hay luz* is on pages
  218 and 219, in Gm and in Am. The book disambiguates them in the title and so does the
  filename — see the naming rules in `songs/README.md`.

### 3. Check it

`pnpm validate` reads every file in `songs/` and reports:

- **errors** — frontmatter missing a required field, a `positions` string that is not
  four digits, a `[Chord]` used but never defined, a filename that is not the title's
  slug. These break the app, and the command exits non-zero.
- **warnings** — a chord defined but never used, spacing that does not match the rules in
  `songs/README.md`, a chord above the 4th fret. These do not fail the run.

The spacing warnings are worth taking seriously even though they are only warnings: the
app positions each chord absolutely above monospaced lyrics, so the spaces after a chord
are what stop the next chord from landing on top of it.

## Path Aliases

- `@/*` maps to `src/*` (configured in tsconfig.json)

## Code Style

- Uses Biome for linting and formatting
- TypeScript strict mode enabled
- Tailwind CSS v4 for styling
