# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 application for displaying Venezuelan ukulele songs with chord diagrams. The app reads songs from markdown files in the `songs/` directory and displays them with interactive chord diagrams and lyrics with chord positioning.

This project follows a **mobile-first** and **offline-first** approach, prioritizing mobile user experience and ensuring functionality without network connectivity.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter and auto-fix issues
npm run lint

# Format code
npm run format
```

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

## Path Aliases

- `@/*` maps to `src/*` (configured in tsconfig.json)

## Code Style

- Uses Biome for linting and formatting
- TypeScript strict mode enabled
- Tailwind CSS v4 for styling
