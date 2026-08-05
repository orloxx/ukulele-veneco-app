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
 * the book printed is offered, marked, and first — **except on the cuatro,
 * where for 40 songs of 276 it is not offered at all.** That case gets its own
 * sentence rather than a silently different starting point.
 *
 * **The songs that can offer nothing get a sentence, not a disabled select.**
 * What is true is that the cancionero does not print the chords the song would
 * need in another key — not that the app cannot transpose, and not that
 * something has gone wrong. A greyed-out control says the second thing.
 *
 * **Every one of those sentences names the instrument since M15**, and that is
 * not decoration: the offered set is a fact about the cancionero *and* the
 * instrument, so a reader who finds a key missing has to be able to tell which
 * of the two took it away.
 */

import { useInstrument } from "@/contexts/InstrumentContext";
import type { Transposition } from "@/lib/transpose";
import { PRINTED_KEY } from "@/lib/transposeChoice";

interface TransposeControlProps {
  /** Every key this song can be played in on the current instrument. */
  offered: Transposition[];
  current: Transposition;
  /** The written key the book printed, offered or not. */
  printedKey: string;
  /** True when the book's own key is not one this instrument can draw. */
  printedKeyUnavailable: boolean;
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
  printedKey,
  printedKeyUnavailable,
  onChoose,
  id,
}: TransposeControlProps) {
  const { instrument } = useInstrument();
  const shapes = `Formas para ${instrument.label.toLowerCase()}`;

  // The book prints this song and nothing else can be built from it. 18 songs
  // of 276 on either instrument, and the copy has to be about the cancionero
  // rather than about the app: this is a limit of the source, honestly
  // reported. On the cuatro that single key is printed+2 rather than the
  // book's own, so "se toca como está escrita" would be false.
  if (offered.length === 1) {
    return (
      <p className="uv-transpose__none">
        El cancionero no imprime los acordes que esta canción necesitaría en
        otro tono.{" "}
        {printedKeyUnavailable ? (
          <>
            En {instrument.label.toLowerCase()} sale en{" "}
            <span className="uv-transpose__printed">{current.key}</span>, un
            tono por encima del{" "}
            <span className="uv-transpose__printed">{printedKey}</span> que trae
            el cancionero.
          </>
        ) : (
          "Así que se toca como está escrita."
        )}
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

      {/* Which instrument the diagrams below are drawn for. It is shown on both
          instruments rather than only on the cuatro: the toggle is in the
          header, two screens away from the shapes it governs, and a caption
          that only ever appears in the non-default state is one a reader learns
          to stop looking for. */}
      <p className="uv-transpose__shapes">{shapes}</p>

      {/* The failure this guards against is a reader who forgot they moved the
          song and is playing next to somebody reading the book. So the marker
          names the printed key rather than merely saying "transposed" — the
          useful sentence is the one that gets them back in the room. It is not
          `aria-live`: the select's own value already announces the change, and
          a second announcement on every arrow-key press through twelve options
          would be noise. */}
      {printedKeyUnavailable ? (
        <p className="uv-transpose__moved">
          El cancionero la trae en{" "}
          <span className="uv-transpose__printed">{printedKey}</span>, y en{" "}
          {instrument.label.toLowerCase()} ese tono necesita un acorde que el
          cancionero no dibuja. Estos son los que sí salen.
        </p>
      ) : moved ? (
        <p className="uv-transpose__moved">
          El cancionero la trae en{" "}
          <span className="uv-transpose__printed">{printedKey}</span>
        </p>
      ) : null}
    </div>
  );
}
