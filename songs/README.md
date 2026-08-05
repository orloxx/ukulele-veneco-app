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

**`key` and `timeSignature` hold whatever the masthead said, including more than one.** A
song that modulates carries both keys separated by `; ` — `venezuela.md` reads `A; Bb`,
`tus-ojos.md` reads `G; E; C`, and `hay-que-ser-del-caribe.md` reads `B; C; D; Eb`. Ten
songs do this. The compás can change mid-song the same way. Where the change happens is a
heading in the body, because that is where the book prints it; the frontmatter only says
which keys the song visits.

**`year` may be absent.** Seven songs have no four-digit year to take — the credit reads
`~1930`, or `1916-1946`, or `s. XIX`. The rule is *take the first number the credit
prints*, and where there is no number the field is omitted and the century goes in the
notes slot below. See `DECISIONS.md` 10 in the vault.

**No Cyrillic, ever.** Three pages of the book decoded with a Cyrillic **е** (U+0435) where
the word wants a Latin `e`, because the subset font's own character table was wrong.
`pnpm validate` fails on any character in the Cyrillic block, and the reason it is an error
rather than a warning is that nothing about it is visible: it renders as `e`, and the only
symptom is a search that finds a song it should have found and does not. See `DECISIONS.md`
11 in the vault.

### Fingerings follow the book, not the standard shapes

`positions` is a 4-digit fret string for the GCEA strings, and it is **whatever the
cancionero draws on that song's page** — not the shape you would find on a chord chart.
The book draws `Em` as `0402` where every chart prints `0432`, and the book wins. See
`DECISIONS.md` 6 in the vault for why.

**Since M15 the app can draw these for a cuatro as well, and it changes nothing here.**
Every string in this folder is still GCEA and still the book's own diagram. A cuatro is
A-D-F♯-B, which is the ukulele up a tone in every pitch class, so the app draws a cuatro
chord by looking up the book's diagram for the chord *a tone below* — the same four digits,
found on a different page. Nothing is transcribed twice and nothing is invented, which is
why the sentence below needs no second half: **there is still exactly one record, and it is
the cancionero.**

Two things follow from that, and both catch people out:

- **It is per song, not per chord.** The same name can have different fingerings in
  different songs — page 6 draws `D7` as `2020`, page 13 draws it as `2223` — because the
  book voices a chord to suit the arrangement it sits in. Copy the page you are on.
- **Do not "correct" an unfamiliar shape.** `C#` = `6544` is high up the neck and looks
  wrong beside the usual `1114`. It is not wrong; it is what the book prints.

Every `positions` string in this folder was read off the diagram printed on that song's own
page, and then checked back against it. The last run of that check, taken immediately
before the source was retired at M6, reported **276 songs checked against the book, 0
disagreeing**. Both the book and the tool that read it are gone, so nothing can re-derive
that number: **a fingering already in a file is the record**, and changing one is changing
the source, not correcting it.

**That last sentence stands, and BUG-019 is the exception that shows what it costs.** The
zero was worth less than it read: these files were written *by* the reader, and the check
compared them against the same reader looking at the same pages, so it could only ever find
a hand-edit. It could not find a page the reader misread the same way twice — and there was
one. The book draws a **barre** as a dot at each end joined by a line; the reader counted
dots and not the line, so it kept the two ends and dropped every string the bar covered in
between. Twenty diagrams over thirteen songs lost an interior string, and `cancion-suave`'s
`Db` went in as `1014` where the page plainly draws `1114` — the shape the note above calls
"the usual" one.

So the rule to apply is narrower than "never change a fingering". **Do not change one
because it is unfamiliar** — that is what the `6544` note above is for, and it is still the
common case. **Do change one that is not the chord it is named after**, because no page in
the cancionero draws a `Db` with no D♭ in it. `pnpm transpose` now asserts exactly that, and
carries the eighteen the book really does draw against their names.

**The book coins a new name rather than reuse one.** Where a song needs two fingerings of
the same chord, the cancionero gives the second shape a second name — `Edim7` beside
`Edim7²` in `criollisima.md`, `C#m²` and `B²` in `papua-retroespas.md`, `Em7^` beside a
plain `Em7` in `terrenal.md`, `E²` in `mi-cura-mi-enfermedad.md`. That is this rule seen
from the other side: a fingering belongs to a song, so a song that needs two of them needs
two names. The superscripts and carets are deliberate, and chord names match literally —
`[Edim7]` and `[Edim7²]` are two different chords.

### Notes above the song

Anything the cancionero prints about the song as a whole, rather than about a line of it,
goes as a plain line at the top of the body — above the first `##` heading:

```markdown
---
…frontmatter…
---

Capo 1

## Intro
```

The two that occur most are **`Capo <n>`**, printed on 51 of the book's 277 pages, and the
occasional instruction like `Versión más simple para el ukulele`. The frontmatter has no
field for either. A `capo` field would be the better home for the first, and that is the
backlog's *capo or transpose control*; until it exists, a line of text is what keeps the
information in the song instead of losing it.

`src/lib/songs.ts` reads this slot at build time and needs no edit here to do it: a bare
`Capo <n>` becomes the badge on the sheet, anything else becomes a plain note under the
title. The parse is deliberately conservative — a leading line carrying a bracket, a bar
line or a strum arrow is left in the body, because the cost of an untidy sheet is smaller
than the cost of a missing lyric. Two songs rely on that: `jota-carupanera.md` opens with a
rasgueo, and `sin-sombra-no-hay-luz-gm.md`'s `Capo en traste 1, versión de estudio` stays a
note rather than becoming a badge that would drop half of it.

**A duet's voice legend goes here too.** Two songs name their voices in a stacked legend
that the book sets in the top-right margin, keying a colour coding that plain text cannot
carry — see `colgando-en-tus-manos.md`. The names are kept as plain lines at the top of the
body, unattached to any line, the same way `Capo 1` is.

### Chord Notation in Lyrics

Chords are indicated using square brackets `[ChordName]` at the position where they should be played:

```
[C]Verse line starts here
This is a line with a [G]chord in the [Am]middle
[F]Another verse [C]line
```

#### Round brackets are an anticipation, not a chord to strum

`(ChordName)` is the cancionero's own mark, and it means something different from
`[ChordName]`: the chord is **optional or passing, and the change starts earlier than the
line it belongs to**. It is printed where the change actually begins — usually inside the
last word of a line — rather than at the top of the line that follows.

So the chord in round brackets is **always the chord that comes next**, arriving a few
syllables early:

```
[Gmaj7] Mi burbu·ja   [Em] no se rom[F#m]pe aunque la so(Gmaj7)ples
[Gmaj7]      [Gmaj7]      [Em] Puedes ver[F#m]me, no escuchar(Gmaj7)me
```

**Copy it as the book sets it, and never promote it to `[X]`.** A square bracket renders a
diagram and tells the player to strum there, which is not what the page says. `pnpm
validate` warns when a `(X)` is not the chord that follows it, because in 26 of 26 cases
across the first 79 songs it was.

Round brackets around anything that is not one of the song's chords are ordinary text — the
book uses them for backing vocals and asides too, like `(Cuidado, mucho cuidado)` in
`colgando-en-tus-manos.md`. Those are left exactly alone.

#### A lyric line keeps the book's own beat dots

The cancionero prints a middle dot `·` inside the lyric line to mark where the beat falls,
on 133 of its 277 pages — so it lands wherever the beat lands, including mid-word: page 16
sets `Es difí·cil recobrar·`. **A line with words in it is copied exactly as the book sets
it**, dots included. `no-es-facil-amar-a-una-mujer.md` is the reference.

The `·`-attachment and spacing rules below are for lines with **no words** — an intro, a
solo, a strumming pattern. They do not apply to a lyric line, and the one thing to
normalise in a lyric line is a gap wider than the rule where two chords sit together: the
book aligns those in a proportional font and the app renders monospaced. `pnpm validate`
gives the exact count it wants; take its number.

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

### Sections, and the one heading that is deliberately empty

Section headings are `##` — `## Coro`, `## Intro`, `## Riff (x2)`, whatever the book sets in
bold. Two things it prints look alike and are not:

- **An abbreviated section is written out in full.** Where the book prints the bare word
  *Coro* to mean "and the chorus again", the chorus is copied out under the heading. A
  phone has no page to flip back to, so an abbreviation costs the player more than the
  duplication costs the file.
- **A repeat instruction is not.** `Repetir desde Instrumental`, `Repetir desde el
  principio`, `Repetir desde el principio y luego Outro` — these span whole sections, and
  writing one out would double the song to spare one scroll. They stay as a heading with
  nothing under it.

That second case is the **only** reason a `##` in this folder is ever empty; an empty
heading anywhere else is a transcription that stopped halfway. See `DECISIONS.md` 8 in the
vault.

### Alignment the rules cannot describe

Three songs keep a layout that the spacing rules above cannot express, and in all three the
book's own alignment is what a player needs. They are the reason `pnpm validate` is not
expected to come back with zero warnings:

| File | What it keeps | What it costs |
| --- | --- | --- |
| `aun.md`, `volare.md`, `comando-borracho.md`, `la-piel-del-mal.md` | chords over a four-line TAB staff, verbatim | six spacing warnings, all in `aun.md` |
| `jota-carupanera.md` | a rasgueo drawn as chord names over `↦ ← ↠` | one *defined but never used* |

The body renders monospaced, which is exactly what a TAB staff needs. **Do not re-space
either shape to satisfy the validator** — the warning is the right answer being reported as
the wrong one, and silencing it breaks the song.

The other eleven *defined but never used* warnings are an ordinary thing and also stay: the
cancionero prints a diagram for a chord the arrangement never reaches, and dropping it from
`chords:` would be editing the book rather than transcribing it.

### Example Song File

See `barlovento.md` for a complete example.

## File Naming Convention

The filename is the title, kebab-cased: accents folded, everything that is not a letter
or a digit collapsed to a hyphen. `Tonada de luna llena` → `tonada-de-luna-llena.md`,
`Detén la noche` → `deten-la-noche.md`. `pnpm validate` enforces it, because the
filename is the URL and a mismatch is a 404.

**A title ending in parentheses may keep them or drop them**, because the cancionero
uses parentheses for two different jobs:

| Job | Example | Filename |
| --- | --- | --- |
| An alternative title | `It Never Ends (Quinta Anauco)` | `it-never-ends.md` — dropped |
| Telling two songs apart | `Sin sombra no hay luz (Gm)` | `sin-sombra-no-hay-luz-gm.md` — kept |

The second is not hypothetical: Sentimiento Muerto's *Sin sombra no hay luz* appears
twice, once in Gm and once in Am, and the book itself disambiguates them in the title.
When the parenthetical is the only thing telling two files apart, it stays in the
filename. Otherwise it goes, and the full title still lives in the frontmatter.
