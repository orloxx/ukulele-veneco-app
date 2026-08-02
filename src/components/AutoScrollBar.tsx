"use client";

/**
 * The control that scrolls the sheet while you play.
 *
 * **A thin sticky band under the header**, chosen by Iker (2026-08-02) over a
 * floating pill and over a block in the song head. The head loses the control
 * the moment scrolling starts, which is the one moment the speed needs
 * adjusting; a pill covers a corner of the sheet and would be this app's first
 * floating element. The bar costs about fifty pixels of phone screen,
 * permanently, and that cost is what `M9 · 5` is asked to judge on a real song
 * with a real instrument.
 *
 * **Both controls are native**, per vault `DECISIONS.md` 17. That decision's
 * rule is that the filter combobox's answer does not generalise: it was
 * hand-built because a `<select>` was *specifically* inadequate at 181 options,
 * and nothing about a range input is inadequate at eight speed steps. Building a
 * slider by hand here would mean inheriting the platform's rules by hand, which
 * is exactly what BUG-014 cost.
 *
 * **No global key is bound to play/pause, deliberately.** The key everybody
 * reaches for is Space, and Space is the browser's page-down — taking it from a
 * reader on a laptop to save them one click is a bad trade on a page whose whole
 * job is being read. The button is a `<button>`, so Space and Enter work on it
 * when it has focus, which is the platform's own answer.
 */

import { type RefObject, useEffect, useState } from "react";
import { IconPause, IconPlay } from "@/components/icons";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  DEFAULT_SPEED_INDEX,
  readSpeedIndex,
  SCROLL_SPEEDS,
  writeSpeedIndex,
} from "@/lib/scrollSpeed";

interface AutoScrollBarProps {
  /** Which song's pace to remember. */
  slug: string;
  /** The sheet, whose line box is the unit the pace is expressed in. */
  sheetRef: RefObject<HTMLElement | null>;
}

export function AutoScrollBar({ slug, sheetRef }: AutoScrollBarProps) {
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);

  // Read on mount rather than in the initial state: the server renders this
  // control too, and seeding it from `localStorage` would make the first client
  // render disagree with the markup it is hydrating. The read is synchronous
  // and lands in the first commit, so the most it costs is one paint at the
  // default — not the flash of the wrong theme that `theme.ts` exists to
  // prevent, because this is a control's value and not the page's ground.
  useEffect(() => {
    setSpeedIndex(readSpeedIndex(slug));
  }, [slug]);

  const linesPerMinute = SCROLL_SPEEDS[speedIndex];
  const { isRunning, toggle } = useAutoScroll({ linesPerMinute, sheetRef });

  useWakeLock(isRunning);

  // Written when a person moves the slider, and never on a frame of the loop.
  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setSpeedIndex(next);
    writeSpeedIndex(slug, next);
  };

  return (
    <div className="uv-autoscroll">
      <button
        type="button"
        onClick={toggle}
        className="uv-iconbtn uv-autoscroll__toggle"
        // The accessible name carries the state, the way SaveOfflineButton's
        // does between Guardar and Quitar. An icon that swaps under a fixed
        // label leaves a screen-reader user with no idea which one is showing.
        aria-label={
          isRunning
            ? "Detener el desplazamiento automático"
            : "Desplazar la letra automáticamente"
        }
        aria-pressed={isRunning}
      >
        {isRunning ? <IconPause /> : <IconPlay />}
      </button>

      <input
        type="range"
        className="uv-autoscroll__speed"
        min={0}
        max={SCROLL_SPEEDS.length - 1}
        step={1}
        value={speedIndex}
        onChange={handleSpeedChange}
        aria-label="Velocidad del desplazamiento"
        // The slider's own value is an index into the steps, which means
        // nothing said out loud. This is what the reader actually chose.
        aria-valuetext={`${linesPerMinute} líneas por minuto`}
      />

      {/* Interface text, so not monospace: a pace is not a tono, a compás or a
          chord, and the landing's counted figures are the only exception the
          system sanctions (vault DECISIONS.md 12). Hidden from assistive tech
          because `aria-valuetext` above already says it, in words. */}
      <span className="uv-autoscroll__readout" aria-hidden="true">
        {linesPerMinute}
        <span className="uv-autoscroll__unit">líneas/min</span>
      </span>
    </div>
  );
}
