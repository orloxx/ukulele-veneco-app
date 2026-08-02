/**
 * The icon set: Phosphor Icons, regular weight, inlined as paths.
 *
 * Phosphor was chosen over Lucide for its softer terminals, which sit better
 * with Bricolage's humanist edge. They are inlined rather than installed so an
 * offline-first PWA has nothing extra to cache and no dependency to keep — for
 * a new icon, copy the path from https://phosphoricons.com rather than redrawing
 * it, and add it here.
 *
 * There are no emoji anywhere in this app (vault DECISIONS.md 12). If a UI needs
 * a symbol, it needs an icon from this file.
 *
 * Every icon is `aria-hidden`: each one ships beside a text label, or inside a
 * control that carries its own accessible name.
 */

interface IconProps {
  /** Square, in px. */
  size?: number;
  className?: string;
}

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 256 256",
    fill: "currentColor",
    "aria-hidden": true,
    focusable: false,
    className,
  } as const;
}

/** magnifying-glass */
export function IconSearch({ size = 17, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M229.66 218.34l-50.07-50.06a88.11 88.11 0 10-11.31 11.31l50.06 50.07a8 8 0 0011.32-11.32zM40 112a72 72 0 1172 72 72.08 72.08 0 01-72-72z" />
    </svg>
  );
}

/** arrow-left */
export function IconBack({ size = 17, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M224 128a8 8 0 01-8 8H59.31l58.35 58.34a8 8 0 01-11.32 11.32l-72-72a8 8 0 010-11.32l72-72a8 8 0 0111.32 11.32L59.31 120H216a8 8 0 018 8z" />
    </svg>
  );
}

/** arrow-right */
export function IconArrow({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M221.66 133.66l-72 72a8 8 0 01-11.32-11.32L196.69 136H40a8 8 0 010-16h156.69l-58.35-58.34a8 8 0 0111.32-11.32l72 72a8 8 0 010 11.32z" />
    </svg>
  );
}

/** tray-arrow-down — saving a song to the phone */
export function IconDownload({ size = 19, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M224 152v56a16 16 0 01-16 16H48a16 16 0 01-16-16v-56a8 8 0 0116 0v56h160v-56a8 8 0 0116 0zm-101.66 5.66a8 8 0 0011.32 0l40-40a8 8 0 00-11.32-11.32L136 132.69V40a8 8 0 00-16 0v92.69l-26.34-26.35a8 8 0 00-11.32 11.32z" />
    </svg>
  );
}

/** check-circle */
export function IconCheck({ size = 19, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M173.66 98.34a8 8 0 010 11.32l-56 56a8 8 0 01-11.32 0l-24-24a8 8 0 0111.32-11.32L112 148.69l50.34-50.35a8 8 0 0111.32 0zM232 128A104 104 0 11128 24a104.11 104.11 0 01104 104zm-16 0a88 88 0 10-88 88 88.1 88.1 0 0088-88z" />
    </svg>
  );
}

/** moon */
export function IconMoon({ size = 19, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M233.54 142.23a8 8 0 00-8-2 88.08 88.08 0 01-109.8-109.8 8 8 0 00-10-10 104.84 104.84 0 00-52.91 37A104 104 0 00136 224a103.09 103.09 0 0062.52-20.88 104.84 104.84 0 0037-52.91 8 8 0 00-1.98-7.98z" />
    </svg>
  );
}

/** sun */
export function IconSun({ size = 19, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M120 40V16a8 8 0 0116 0v24a8 8 0 01-16 0zm72 88a64 64 0 11-64-64 64.07 64.07 0 0164 64zm-16 0a48 48 0 10-48 48 48.05 48.05 0 0048-48zM58.34 69.66a8 8 0 0011.32-11.32l-16-16a8 8 0 00-11.32 11.32zm0 116.68l-16 16a8 8 0 0011.32 11.32l16-16a8 8 0 00-11.32-11.32zM192 72a8 8 0 005.66-2.34l16-16a8 8 0 00-11.32-11.32l-16 16A8 8 0 00192 72zm5.66 114.34a8 8 0 00-11.32 11.32l16 16a8 8 0 0011.32-11.32zM48 128a8 8 0 00-8-8H16a8 8 0 000 16h24a8 8 0 008-8zm80 80a8 8 0 00-8 8v24a8 8 0 0016 0v-24a8 8 0 00-8-8zm112-88h-24a8 8 0 000 16h24a8 8 0 000-16z" />
    </svg>
  );
}

/** squares-four — the link to the full-screen chord grid */
export function IconGrid({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M104 40H56a16 16 0 00-16 16v48a16 16 0 0016 16h48a16 16 0 0016-16V56a16 16 0 00-16-16zm96 0h-48a16 16 0 00-16 16v48a16 16 0 0016 16h48a16 16 0 0016-16V56a16 16 0 00-16-16zm-96 96H56a16 16 0 00-16 16v48a16 16 0 0016 16h48a16 16 0 0016-16v-48a16 16 0 00-16-16zm96 0h-48a16 16 0 00-16 16v48a16 16 0 0016 16h48a16 16 0 0016-16v-48a16 16 0 00-16-16z" />
    </svg>
  );
}

/** wifi-slash — the offline bar. Amarillo, never rojo: offline is the feature. */
export function IconWifiSlash({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M53.92 34.62a8 8 0 10-11.84 10.76l19.24 21.16C24.16 91.34 4 124.42 4 128a8 8 0 003.2 6.4 175.6 175.6 0 0032.8 19.8 8 8 0 006.4-14.66 161.5 161.5 0 01-23.2-13.24c9.6-10.9 27.2-28.3 50.4-40.2l19.6 21.6A40 40 0 00128 168a39.6 39.6 0 0014.3-2.6l59.78 65.78a8 8 0 1011.84-10.76zM128 152a24 24 0 01-13.1-44.1l31.2 34.3A23.9 23.9 0 01128 152zm120.8-17.6a8 8 0 000-12.8C243.9 117.7 196.4 72 128 72a132 132 0 00-22 1.84 8 8 0 002.7 15.77A116 116 0 01128 88c55.6 0 96.8 34.5 110.4 47.4a8 8 0 0010.4-1z" />
    </svg>
  );
}

/** play — start the sheet scrolling itself */
export function IconPlay({ size = 20, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M232.4 114.49L88.32 26.35a16 16 0 00-16.2-.3A15.86 15.86 0 0064 39.87v176.26A15.94 15.94 0 0080 232a16.07 16.07 0 008.36-2.35l144.04-88.14a15.81 15.81 0 000-27.02zM80 215.94V40.05l143.83 88z" />
    </svg>
  );
}

/** pause — stop it again */
export function IconPause({ size = 20, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M200 32h-32a16 16 0 00-16 16v160a16 16 0 0016 16h32a16 16 0 0016-16V48a16 16 0 00-16-16zm0 176h-32V48h32zM88 32H56a16 16 0 00-16 16v160a16 16 0 0016 16h32a16 16 0 0016-16V48a16 16 0 00-16-16zm0 176H56V48h32z" />
    </svg>
  );
}

/**
 * lock — the capo badge.
 *
 * A substitution: Phosphor has no capo glyph, and a capo is a clamp, so the lock
 * is the closest honest stand-in. Replace it the day a custom capo mark exists.
 */
export function IconCapo({ size = 13, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M208 88h-24V48a56 56 0 00-112 0v40H48a16 16 0 00-16 16v96a16 16 0 0016 16h160a16 16 0 0016-16v-96a16 16 0 00-16-16zM88 48a40 40 0 0180 0v40H88z" />
    </svg>
  );
}
