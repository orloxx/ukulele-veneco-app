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

**That PDF is not in the repository, and never will be.** `public/` is served verbatim by
Vercel, so a committed copy would publish the whole book at a guessable URL — and deleting
it later would not help, because the history would keep serving it to every clone. It is
gitignored. Download the 2025 web edition from [elukulelevene.co](https://elukulelevene.co)
into `public/` when you need to transcribe, and leave it there.

```bash
node scripts/extract-page.mjs 14        # 1. read the book page
$EDITOR songs/quinta-anauco.md          # 2. write the song file
pnpm validate                           # 3. check the format
node scripts/extract-page.mjs --verify  # 4. check the fingerings against the book
git commit                              # 5. commit it
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
node scripts/extract-page.mjs 14                    # book page 14, as text
node scripts/extract-page.mjs 14 --json             # the same, structured
node scripts/extract-page.mjs --find "Barlovento"   # look the page up by title
node scripts/extract-page.mjs --check               # read all 277 pages and self-check
node scripts/extract-page.mjs --verify              # diff songs/ against the diagrams
```

**Prefer `--find` when you are working from a list of titles**, which the milestone issues
are. Their numbers come from the book's *index*, which counts songs, and songs and pages
stop agreeing at 197 — see below.

The page number is the **printed** one, not the PDF's — page 1 of the book is the 24th
page of the file. The script refuses to print a page whose printed footer disagrees with
the page it was asked for, so a silently-off-by-something mapping cannot reach a song
file. `--check` proves the mapping over the whole book in one go.

**Paste the `chords:` block it gives you, exactly as it comes.** The fingerings follow
the book, not the standard ukulele shapes — the book draws `Em` as `0402` where every
chart prints `0432`, and the book wins (`DECISIONS.md` 6 in the vault). Do not "correct"
a shape that looks unfamiliar; `--verify` will fail it if you do. This is per song, not
per chord name: page 6 draws `D7` as `2020` and page 13 draws it as `2223`, and both are
right on their own page.

What it will not do for you:

- **Section headings.** The book sets *Intro*, *Coro*, *Puente* in bold; the extractor
  prints them as plain lines and you turn them into `## Coro`.
- **The spacing rules.** The extractor reproduces the book's own spacing. The rules in
  `songs/README.md` are what the app needs, and they are not the same thing.
- **`year`.** The credit line reads `Artist (Composers, 1966)`; the year is the one in
  the parentheses, and the artist is the part before them.
- **`capo`.** Some pages print a capo fret — **51 of the 277**, so this is not a rarity.
  The frontmatter has no field for it, and the extractor emits it as a comment rather than
  a key. **Write it as a plain `Capo <n>` line at the top of the body**, above the first
  section heading, the way `songs/anoche.md` and `songs/es-que-me-faltas-tu.md` do. The app
  renders it as text, which is enough to play from; a real field is a bigger change and is
  the backlog's *capo or transpose control*.

### 2. Watch for these

- **Page 197 has no song of its own.** *La Muerte del Rucio Moro* runs across pages 196
  and 197, the only song in the book that does. So there are **277 numbered pages and 276
  songs**, and past page 197 the progress count is one behind the page number:
  `ls songs/*.md | wc -l` + 1 is the next page to transcribe.

  The milestone issues on GitHub number their songs from the book's index, so from
  *Nuestro amor será* onward their numbers are one **below** the book page. `--find` is
  immune to this and the numbers are not; use it.
- **Three pages are set in two columns** (102, 196, 197). The extractor prints the left
  column and then the right, and says so at the top. Read them in that order.
- **Two songs share a title.** Sentimiento Muerto's *Sin sombra no hay luz* is on pages
  218 and 219, in Gm and in Am. The book disambiguates them in the title and so does the
  filename — see the naming rules in `songs/README.md`.
- **The book prints beat dots inside the lyric line, and half of it does** — 133 of the
  277 pages. They mark where the beat falls, so they land wherever the beat lands,
  including mid-word: page 16 sets `Es difí·cil recobrar·`. **Keep a lyric line exactly as
  the book sets it.** The `·`-attachment and spacing rules in `songs/README.md` are for
  lines with *no words* — an intro, a solo, a strumming pattern. `songs/no-es-facil-amar-a-una-mujer.md`
  is the reference for a lyric line that keeps its dots; `songs/barlovento.md` for an
  instrumental line that gets the rules applied.

  The one thing to normalise is a **gap wider than the rule** where two chords sit
  together: the book aligns them in a proportional font and the app renders monospaced, so
  `pnpm validate` will tell you the exact count it wants. Take its number.
- **Some pages print a chord in parentheses** — `(Gmaj7)` on page 17, `(G)` on page 19,
  40 pages in all. Nothing in the book says what it means, and it is not the same mark as
  a bracketed chord. **Copy it verbatim**, parentheses included, and do not promote it to
  `[Gmaj7]`. That keeps the question open and answerable later; guessing closes it wrongly
  in 40 songs at once. It is `M2 · 8`.
- **An abbreviated chorus is written out; a repeat instruction is not.** Many pages print
  the bare word *Coro* where the chorus comes round again, and that is copied out in full,
  because a phone has no page to flip back to. What looks the same and is not is a *da
  capo* — page 48's `Repetir desde Instrumental`, page 62's `Repetir desde el principio`,
  page 64's `Repetir desde el principio y luego Outro`. Those span whole sections, and
  writing one out would double the song to spare one scroll. They stay as their own
  heading with nothing under it, which is the only reason a `##` in `songs/` is ever
  empty.
- **Two pages carry a duet's voice legend** — 45 and 49, and no others in the book. Three
  names sit stacked at `x≈426`, away from the lyric column at `x=40`, and at the same
  three `y` positions on both pages: it is a top-right legend for a colour coding, not a
  label attached to the line beside it. The extractor prints them interleaved with the
  body, because it reads in `y` order. Move them to the top of the body as plain lines,
  above the first heading, the way `Capo 1` sits — see `songs/colgando-en-tus-manos.md`.
  `--json` and a filter on `x > 300` is how you find one.
- **The book invents a chord name when a song needs two fingerings of one chord.** Page 64
  draws `Edim7` at 0101 and `Edim7²` at 3434; page 77 has `C#m²` and `B²`; page 72 has
  `Em7^` beside a plain `Em7`. Copy the superscript or the caret as set. This is the
  corollary of `DECISIONS.md` 6 in the vault — a fingering belongs to a song, so a song
  that needs two of them needs two names, and the book supplies one.
- **One page prints tablature.** Page 68 closes *Volare* with `Riff inicial de la canción`
  over a four-line TAB staff. It is kept verbatim under its own heading: the app renders
  the body monospaced, which is what a TAB staff needs. `grep '^[AECG]|' songs/` finds
  every one, and there is currently exactly one.
- **A masthead can carry more than two keys, and the compás can change too.** Page 78's
  reads `G; E; C` and the song is marked `Cambio de clave` twice; page 57 is marked
  `Cambio de compás a 4/4, más rápido` and page 71 `Cambio ritmo a 6/8`. `key` and
  `timeSignature` hold what the masthead says; the change itself is a heading where the
  book prints it.

### 3. Check it

`pnpm validate` reads every file in `songs/` and reports:

- **errors** — frontmatter missing a required field, a `positions` string that is not
  four digits, a `[Chord]` used but never defined, a filename that is not the title's
  slug, a chord spanning more than four frets. These break the app, and the command exits
  non-zero.
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

**`node scripts/extract-page.mjs --verify` is the other half of the check.** `pnpm
validate` knows the format; it does not know the book. `--verify` holds every song's
`positions` up against the diagrams printed on its own page and exits non-zero on a
disagreement, which is what stops a fingering drifting from the source over 276 songs.

The two are separate commands because they have separate lifetimes: `validate-songs.mjs`
is about the song format and outlives the PDF, while `--verify` needs the book and dies
with it at M6. That is also why this one is not wired into `pnpm validate` — see
`DECISIONS.md` 6 in the vault.

## Path Aliases

- `@/*` maps to `src/*` (configured in tsconfig.json)

## Code Style

- Uses Biome for linting and formatting
- TypeScript strict mode enabled
- Tailwind CSS v4 for styling
