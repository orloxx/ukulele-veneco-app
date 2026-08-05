/**
 * Naming the note a string is sounding, from nothing but numbers.
 *
 * This file takes a buffer of samples and a sample rate and returns a frequency.
 * It knows nothing about Web Audio, React, the DOM or a ukulele, and that is
 * deliberate: a detector reachable only through a live microphone can be checked
 * exactly one way — a person hums at it and says *looks right* — which is not a
 * check. A pure function can be handed a signal whose pitch is known to fifteen
 * decimal places and its answer measured in cents.
 *
 * **It is not an FFT, and the next reader will propose one.** An FFT is the
 * obvious tool and it is the wrong one at this resolution: 2048 bins at 48kHz is
 * about 23 Hz per bin, and a tuner has to resolve a *cent* — at the C string,
 * 261.63 Hz, one cent is 0.15 Hz. Peak-picking a spectrum cannot see that, and
 * interpolating the peak back is a worse version of what the time domain gives
 * directly. So this is normalised autocorrelation, the McLeod Pitch Method: the
 * NSDF over the window, the first peak past the first zero crossing, and
 * parabolic interpolation of that peak. **The interpolation is not a
 * refinement.** Without it the answer is quantised to whole samples, which at
 * A4 = 440 on a 48kHz stream is 109 samples a period and steps of about 9 cents
 * — a tuner that cannot tell in-tune from out.
 *
 * **The failure this is shaped around is the octave error.** Autocorrelation
 * locks onto twice the period as happily as onto the period, and a plucked
 * string is rich in harmonics, so the naive version reports the octave below on
 * some notes and not others — which reads as *the tuner is wrong about the G
 * string* and is really *the tuner is wrong whenever the second harmonic is
 * loud*. What avoids it is picking the **first** peak that clears a threshold
 * below the maximum, rather than the maximum itself: the true period's peak
 * comes first, and the double-period peak that beats it by a hair never gets
 * looked at. `PEAK_THRESHOLD` is that threshold and it is the load-bearing
 * number in this file.
 */

/**
 * The analysis window, in samples, and the `fftSize` the microphone's analyser
 * is set to.
 *
 * **It was sized from the lowest note any tuning offered, and that note is gone
 * — so this is now bigger than it has to be, deliberately.** Until `2.8.0` the
 * ukulele had a baritone tuning whose bottom string is D3 at 146.83 Hz, a period
 * of 6.8ms, and autocorrelation needs at least two periods in the window and
 * wants several: 2048 samples is 42.7ms at 48kHz, about six periods of D3. The
 * app's whole range is now **A3 at 220 Hz to A4 at 440** — the cuatro's 4th
 * string to the ukulele's 1st — which 2048 covers nine times over.
 *
 * **Shrinking it is a change to the one number in this file that decides whether
 * the tuner works, made for no reason anybody has felt.** What a smaller window
 * buys is latency the needle does not need; what it risks is the failure this
 * whole file is shaped around. It stays. If a tuning is ever added back below
 * A3, nothing here has to move — which is the other half of the argument.
 */
export const ANALYSIS_WINDOW = 2048;

/**
 * The band a reported frequency has to fall in.
 *
 * The two tunings span 220 Hz to 440 Hz — an octave, since `2.8.0` — and this is
 * deliberately far wider at both ends: a string is pointed at this thing
 * precisely when it is *out* of tune, sometimes by a great deal, and a tuner
 * that goes silent on the string it is most needed for is worse than one that
 * reads a couple of semitones off. What the band is for is throwing out the
 * octave-below and octave-above answers that survive everything else, and
 * narrowing it to the tunings would defeat that: a string a full octave flat is
 * a thing that happens to a restrung ukulele, and it has to be *readable*.
 */
const MIN_FREQUENCY = 70;
const MAX_FREQUENCY = 1200;

/**
 * How close to the tallest peak a candidate has to be to win outright.
 *
 * This is the whole octave-error defence — see the note at the top of the file.
 * McLeod's paper puts it between 0.8 and 0.9; 0.9 is the stricter end and the
 * one that risks least: too low and a subharmonic peak qualifies, which is the
 * bug. `M10 · 5` asserts this directly, with the maximum-picking control beside
 * it that must report the octave below.
 */
const PEAK_THRESHOLD = 0.9;

/**
 * How periodic the window has to be before this will name a note at all.
 *
 * The NSDF's peak value is 1 for a perfect repeat and drifts toward 0 as the
 * signal stops being periodic, so this is the line between a string and a room.
 * **A tuner that names a note in a silent room is worse than one that says
 * nothing**, because it will be believed and tuned to.
 */
const MIN_CLARITY = 0.6;

/**
 * The quietest window worth analysing, as RMS of the centred samples.
 *
 * Low on purpose. `autoGainControl` is off (see `useMicrophone`), so a ukulele
 * an arm's length from a phone is genuinely quiet, and this only has to clear a
 * mic's own noise floor — everything above that is `MIN_CLARITY`'s job, which is
 * the test that can tell a note from a fan.
 */
const MIN_RMS = 0.004;

/**
 * The note a string is sounding, in Hz, or `null` when there is nothing periodic
 * to report.
 *
 * Returns nothing rather than a guess. Every path out of here is either a
 * frequency this window actually supports or silence.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
): number | null {
  const size = samples.length;
  if (size < 256) return null;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return null;

  // Centre the window before anything else. A microphone's DC offset is small
  // but it is *constant*, which is the one thing autocorrelation is built to
  // find: left in, it raises every lag equally and flattens the peaks this
  // depends on being able to tell apart.
  let sum = 0;
  for (let i = 0; i < size; i += 1) sum += samples[i];
  const mean = sum / size;

  const x = new Float32Array(size);
  let energy = 0;
  for (let i = 0; i < size; i += 1) {
    const value = samples[i] - mean;
    x[i] = value;
    energy += value * value;
  }

  if (Math.sqrt(energy / size) < MIN_RMS) return null;

  const maxLag = Math.min(size >> 1, Math.floor(sampleRate / MIN_FREQUENCY));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));
  if (maxLag <= minLag + 2) return null;

  // Prefix sums of the squares, so the NSDF's denominator is O(1) per lag
  // instead of O(window). It is exactly the same number either way; what it buys
  // is roughly half the arithmetic in the only loop here that costs anything,
  // on a phone that is also running the screen.
  const squares = new Float64Array(size + 1);
  for (let i = 0; i < size; i += 1) squares[i + 1] = squares[i] + x[i] * x[i];
  const total = squares[size];

  /**
   * The normalised square difference function.
   *
   * `2·r(lag) / m(lag)`, where `r` is the autocorrelation over the overlapping
   * part of the window and `m` is the energy of the two halves being compared.
   * Normalising is what makes the peak height mean something on its own — a raw
   * autocorrelation falls away as the overlap shrinks, so its tallest peak is
   * always the shortest lag and a threshold over it would mean nothing.
   */
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag += 1) {
    let correlation = 0;
    for (let j = 0; j + lag < size; j += 1) correlation += x[j] * x[j + lag];
    const denominator = squares[size - lag] + (total - squares[lag]);
    nsdf[lag] = denominator > 0 ? (2 * correlation) / denominator : 0;
  }

  // Walk off the lobe at lag 0 — every signal correlates with itself — and then
  // off the negative stretch that follows it. What is left starts at the first
  // candidate period.
  let lag = 1;
  while (lag <= maxLag && nsdf[lag] > 0) lag += 1;
  while (lag <= maxLag && nsdf[lag] <= 0) lag += 1;

  /** The tallest point of each stretch where the NSDF is positive. */
  const peaks: number[] = [];
  let tallest = 0;
  while (lag <= maxLag) {
    let peak = lag;
    while (lag <= maxLag && nsdf[lag] > 0) {
      if (nsdf[lag] > nsdf[peak]) peak = lag;
      lag += 1;
    }
    // Interior only: the parabola below reads the sample either side of it.
    if (peak > 0 && peak < maxLag) {
      peaks.push(peak);
      if (nsdf[peak] > tallest) tallest = nsdf[peak];
    }
    while (lag <= maxLag && nsdf[lag] <= 0) lag += 1;
  }

  if (peaks.length === 0) return null;

  // **The first peak that clears the threshold, never the tallest.** See the
  // octave-error note at the top: the double-period peak of a harmonic-rich
  // string routinely beats the true one, and it always comes later.
  const threshold = tallest * PEAK_THRESHOLD;
  let chosen = -1;
  for (const peak of peaks) {
    if (peak >= minLag && nsdf[peak] >= threshold) {
      chosen = peak;
      break;
    }
  }
  if (chosen < 0) return null;

  // Parabolic interpolation through the three samples around the peak. The
  // period is the vertex of that parabola, which is almost never a whole number
  // of samples — and the difference between the vertex and the nearest sample is
  // most of the accuracy this thing has.
  const before = nsdf[chosen - 1];
  const at = nsdf[chosen];
  const after = nsdf[chosen + 1];
  const curvature = before - 2 * at + after;
  let shift = curvature !== 0 ? (before - after) / (2 * curvature) : 0;
  if (!Number.isFinite(shift) || shift < -1 || shift > 1) shift = 0;

  const period = chosen + shift;
  if (period <= 0) return null;

  const clarity = at - 0.25 * (before - after) * shift;
  if (!(clarity >= MIN_CLARITY)) return null;

  const frequency = sampleRate / period;
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) return null;

  return frequency;
}

/**
 * How far one frequency is from another, in cents — hundredths of a semitone.
 *
 * The unit exists because pitch is logarithmic and Hz is not: 5 Hz flat is
 * unnoticeable on the A string and a third of a semitone on baritone's D. A cent
 * means the same amount of *wrong* everywhere, which is the only way one
 * in-tune window can serve all four tunings.
 */
export function centsBetween(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target);
}

/**
 * How far off a string may be and still read as *in tune*, in cents.
 *
 * **It is a number, not a design**, and it is the number `M10 · 6` is most
 * likely to send back: too tight and it is unreachable on a real instrument
 * whose pitch bends as the note decays, too loose and the tuner lies. Five cents
 * is where hardware tuners sit and it is about the smallest interval a good ear
 * notices — but nothing on a desk can tell whether it is *reachable*, and
 * reachable is half the specification.
 */
export const IN_TUNE_CENTS = 5;

/** Anything with a frequency this can aim at — in practice, a tuning's string. */
export interface PitchTarget {
  frequency: number;
}

export interface PitchMatch<T extends PitchTarget> {
  target: T;
  /** Signed: negative is flat, positive is sharp. */
  cents: number;
}

/**
 * Which string the reader is most likely trying to tune, and by how far they
 * have missed it.
 *
 * Nearest in **cents**, not in Hz. On a re-entrant tuning the four strings are
 * not in pitch order and two of them can sit a long way apart in Hz while being
 * musically adjacent; measuring the distance the way the ear does is what makes
 * "nearest" mean the string the player has in their hand.
 *
 * It is generic over the target so this file stays free of `tunings.ts` — the
 * detector knows about periodic signals, not about ukuleles.
 */
export function nearestTarget<T extends PitchTarget>(
  frequency: number,
  targets: readonly T[],
): PitchMatch<T> | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;

  let best: PitchMatch<T> | null = null;
  for (const target of targets) {
    if (!(target.frequency > 0)) continue;
    const cents = centsBetween(frequency, target.frequency);
    if (best === null || Math.abs(cents) < Math.abs(best.cents)) {
      best = { target, cents };
    }
  }
  return best;
}
