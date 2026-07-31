interface UkeMarkProps {
  /** Square, in px. */
  size?: number;
  color?: string;
  /**
   * The id of the SVG mask that knocks out the soundhole.
   *
   * It has to be unique per document, so any page rendering the mark more than
   * once passes a distinct one. There is no `useId()` here on purpose: the mark
   * is rendered from server components too.
   */
  id?: string;
}

/**
 * The brand mark: a ukulele body with the soundhole knocked out and the neck
 * bleeding out of the tile.
 *
 * Drawn from the badge illustration's own subject, because the illustration
 * itself is a detailed circular sticker that collapses at favicon size. This is
 * the same drawing as `public/icons/*.svg` — change one and change the other.
 */
export function UkeMark({
  size = 30,
  color = "var(--action-primary)",
  id = "uv-mark",
}: UkeMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
    >
      <mask
        id={id}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="64"
        height="64"
      >
        <rect width="64" height="64" fill="#fff" />
        <circle cx="33.4" cy="32.1" r="5.5" fill="#000" />
      </mask>
      <g mask={`url(#${id})`} transform="translate(-1.4 -2.6)">
        <g transform="rotate(20 32 38)" fill={color}>
          <rect x="29.2" y="-9" width="5.6" height="33" rx="2.6" />
          <circle cx="32" cy="25.5" r="11" />
          <rect x="25.2" y="21" width="13.6" height="23" />
          <circle cx="32" cy="42" r="15" />
        </g>
      </g>
    </svg>
  );
}
