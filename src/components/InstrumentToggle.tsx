"use client";

/**
 * Ukulele ⇄ cuatro, in the header beside the theme toggle.
 *
 * Iker's shape, given when he asked for the milestone: **application level, the
 * way the light and dark themes are switched** — not a control on the song
 * sheet.
 *
 * **It shows the instrument the app is *in*, and `ThemeToggle` beside it shows
 * the one it would move to. That is a deliberate departure and not an
 * inconsistency.** A theme announces itself: the screen is dark or it is not,
 * so an icon of the destination costs nothing. An instrument does not — the
 * only thing on screen that gives it away is the shape of four dots on a grid,
 * which is precisely what a reader who is not sure would have to be able to
 * read in order to check. A control that named the destination would leave the
 * app reporting the opposite of its own state, which is the shape of BUG-016.
 *
 * The accessible name says both, because the visible word alone cannot say
 * whether it is a label or a button.
 *
 * `M15 · Verification`'s last item asks whether this belongs in the header at
 * all, having used it. That is a real question with a real alternative — the
 * song head, beside the tono — and it is not answerable from a desk.
 */

import { useInstrument } from "@/contexts/InstrumentContext";

export function InstrumentToggle() {
  const { instrument, other, choose } = useInstrument();

  return (
    <button
      type="button"
      className="uv-instrument-toggle"
      onClick={() => choose(other.id)}
      aria-label={`Instrumento: ${instrument.label}. Cambiar a ${other.label}`}
      title={`Cambiar a ${other.label}`}
    >
      {instrument.label}
    </button>
  );
}
