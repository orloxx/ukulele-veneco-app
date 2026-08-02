"use client";

/**
 * The control that moves a song to a key you can sing.
 *
 * **A native `<select>`, and that is vault `DECISIONS.md` 17 answered the way
 * the tuner's tuning picker answered it.** 17 hand-built the filter combobox
 * because a `<select>` was *specifically* inadequate at 181 options, and it
 * says in as many words that its answer does not generalise. Twelve keys is not
 * 181, nothing here needs typing or accent-folded matching, and building a
 * listbox by hand would mean re-inheriting the platform's rules — which is
 * exactly what BUG-014 cost.
 *
 * **It is not sticky and it is not a second bar.** `AutoScrollBar` already
 * spends about fifty pixels of phone screen under the header, permanently, and
 * `M11 · 3` ruled a second band out on that ground. This sits in the song head
 * beside the tono it changes, and scrolls away with it: unlike a scroll pace,
 * which needs adjusting *while* the sheet is moving, a key is chosen once
 * before you start singing. If that turns out to be wrong it is outcome 2 of
 * `M11 · 5`, and the fix is a different control rather than a different place.
 *
 * **The way back is the first option, not a second control.** `M11 · 3` asked
 * for one press back to the printed key through the same control, so the key
 * the book printed is always offered, always first, and always marked.
 *
 * **The 18 songs that can offer nothing get a sentence, not a disabled
 * select.** What is true is that the cancionero does not print the chords the
 * song would need in any other key — not that the app cannot transpose, and not
 * that something has gone wrong. A greyed-out control says the second thing.
 */

import type { Transposition } from "@/lib/transpose";
import { PRINTED_KEY } from "@/lib/transposeChoice";

interface TransposeControlProps {
  /** Every key this song can be played in, printed first. */
  offered: Transposition[];
  current: Transposition;
  printed: Transposition;
  onChoose: (semitones: number) => void;
  /**
   * Distinguishes the two `<select>`s the app can render for one song — the
   * sheet's and the chord viewer's — so each `<label>` points at its own.
   */
  id: string;
}

export function TransposeControl({
  offered,
  current,
  printed,
  onChoose,
  id,
}: TransposeControlProps) {
  // The book prints this song and nothing else can be built from it. 18 songs
  // of 276, and the copy has to be about the cancionero rather than about the
  // app: this is a limit of the source, honestly reported.
  if (offered.length === 1) {
    return (
      <p className="uv-transpose__none">
        El cancionero no imprime los acordes que esta canción necesitaría en
        otro tono, así que se toca como está escrita.
      </p>
    );
  }

  const moved = current.semitones !== PRINTED_KEY;

  return (
    <div className="uv-transpose">
      <label className="uv-transpose__label" htmlFor={id}>
        Tono
      </label>

      <select
        id={id}
        className="uv-select uv-transpose__select"
        value={current.semitones}
        onChange={(event) => onChoose(Number(event.target.value))}
      >
        {offered.map((transposition) => (
          <option key={transposition.semitones} value={transposition.semitones}>
            {transposition.key}
            {transposition.semitones === PRINTED_KEY ? " · original" : ""}
          </option>
        ))}
      </select>

      {/* The failure this guards against is a reader who forgot they moved the
          song and is playing next to somebody reading the book. So the marker
          names the printed key rather than merely saying "transposed" — the
          useful sentence is the one that gets them back in the room. It is not
          `aria-live`: the select's own value already announces the change, and
          a second announcement on every arrow-key press through twelve options
          would be noise. */}
      {moved ? (
        <p className="uv-transpose__moved">
          El cancionero la trae en{" "}
          <span className="uv-transpose__printed">{printed.key}</span>
        </p>
      ) : null}
    </div>
  );
}
