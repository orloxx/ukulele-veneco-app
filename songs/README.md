# Songs Database

This folder contains all the ukulele songs in markdown format.

## File Format

Each song is a markdown file with frontmatter containing metadata and the song content with chord notation.

### Frontmatter Structure

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
  - name: Am
    positions: "2000"
  - name: F
    positions: "2010"
---
```

### Chord Notation in Lyrics

Chords are indicated using square brackets `[ChordName]` at the position where they should be played:

```
[C]Verse line starts here
This is a line with a [G]chord in the [Am]middle
[F]Another verse [C]line
```

### Example Song File

See `barlovento.md` for a complete example.

## File Naming Convention

Use kebab-case for file names, e.g., `tonada-de-luna-llena.md`
