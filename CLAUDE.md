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

### Chord Position Format

Positions are 4-digit strings representing fret positions for ukulele strings GCEA (low to high):
- `"0003"` = G:open, C:open, E:open, A:3rd fret (C chord)
- `"2210"` = G:2nd, C:2nd, E:1st, A:open (Dm chord)

## Path Aliases

- `@/*` maps to `src/*` (configured in tsconfig.json)

## Code Style

- Uses Biome for linting and formatting
- TypeScript strict mode enabled
- Tailwind CSS v4 for styling
