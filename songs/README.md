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

#### Spacing Between Consecutive Chords

When chords appear consecutively without enough natural spacing, add spacing for alignment:

**Rule 1: Two chords directly together**
Add (N + 1) spaces, where N = number of letters in the first chord:

```
❌ Incorrect: sin ti[Em] [A7]
✓ Correct:   sin ti[Em]   [A7]  (2 letters + 1 = 3 spaces)
```

**Rule 2: Chord, character(s), then chord**
Add N spaces after the character(s), where N = number of letters in the first chord:

```
❌ Incorrect: dónd[Bm]e [A]fue
✓ Correct:   dónd[Bm]e  [A]fue  (2 letters → 2 spaces after 'e')

❌ Incorrect: Empezand[Gm7]o [A]seguro
✓ Correct:   Empezand[Gm7]o    [A]seguro  (3 letters → 3 spaces after 'o')
```

**Note**: Only applies when chords are close together. If lyrics provide natural spacing, no adjustment needed.

### Strumming Patterns (Instrumental Parts)

For instrumental sections without lyrics, proper spacing is critical for readability:

**Rule 1: Simple chord sequences**
Add a middle dot `·` after each chord, followed by spaces equal to the number of letters in the chord name:

```
❌ Incorrect: [G] [F] [Am] [Cm]
✓ Correct:   [G]· [F]· [Am]·  [Cm]·
```

**Rule 2: Strumming patterns with time signatures**
When patterns follow the time signature (separated by `|`), apply the same spacing:

```
❌ Incorrect: [D] · · · | [Bm] · · ·
              [G] · [F#m] · | [Em] · [A]↓ ·

✓ Correct:   [D]· · · · | [Bm]·  · · ·
             [G]· · [F#m]·   · | [Em]·  · [A]↓ ·
```

**Exception**: If a chord has a character immediately after it (like `↓`, `↑`), skip the middle dot but still add the spacing after the strumming indicator.

Examples:
- `[Dm]↓  ◦` (2 letters → 2 spaces after ↓)
- `[Cmaj7]↓     ·` (5 letters → 5 spaces after ↓)

**Spacing breakdown:**
- `[G]·` (1 letter) → middle dot + 0 extra spaces
- `[F]·` (1 letter) → middle dot + 0 extra spaces
- `[Am]·  ` (2 letters) → middle dot + 1 extra space
- `[Bm]·  ` (2 letters) → middle dot + 1 extra space
- `[F#m]·   ` (3 letters) → middle dot + 2 extra spaces
- `[A]↓` → no middle dot (has strumming indicator)

### Example Song File

See `barlovento.md` for a complete example.

## File Naming Convention

Use kebab-case for file names, e.g., `tonada-de-luna-llena.md`
