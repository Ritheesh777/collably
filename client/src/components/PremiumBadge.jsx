import { IconSparkles } from './icons.jsx';

/**
 * Premium membership marks — worn by active subscribers.
 *
 * Colours come from the logo itself (pink #ff2978 → violet #8020f2 → blue
 * #008dff) and are reserved for premium, keeping the palette scarce:
 *   blue check  = admin-verified (§17)
 *   green mark  = collaborating (§18)
 *   gradient    = paying member
 *
 * The default export is the Instagram-style scalloped SEAL with a tick — used
 * beside names on profiles, cards and lists. `PremiumPill` is the labelled
 * variant for plan cards, where a wordless seal wouldn't explain itself.
 */

// 12-scallop rosette generated mathematically (valleys r=9.6, bumps ctrl=13.6
// on a 24×24 grid) so every dip and swell is perfectly even.
const SEAL_PATH =
  'M12.00 2.40 Q15.52 -1.14 16.80 3.69 Q21.62 2.38 20.31 7.20 Q25.14 8.48 21.60 12.00 ' +
  'Q25.14 15.52 20.31 16.80 Q21.62 21.62 16.80 20.31 Q15.52 25.14 12.00 21.60 ' +
  'Q8.48 25.14 7.20 20.31 Q2.38 21.62 3.69 16.80 Q-1.14 15.52 2.40 12.00 ' +
  'Q-1.14 8.48 3.69 7.20 Q2.38 2.38 7.20 3.69 Q8.48 -1.14 12.00 2.40 Z';

export default function PremiumBadge({ size = 20, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      role="img"
      aria-label="Premium member"
    >
      <title>Premium member</title>
      <defs>
        {/* One shared id — duplicates across instances resolve identically. */}
        <linearGradient id="collably-seal-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2978" />
          <stop offset="52%" stopColor="#8020f2" />
          <stop offset="100%" stopColor="#008dff" />
        </linearGradient>
      </defs>
      <path d={SEAL_PATH} fill="url(#collably-seal-grad)" />
      <path
        d="M8.3 12.3l2.5 2.5 4.9-5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Labelled pill for plan cards / the navbar, where the seal alone is mute. */
export function PremiumPill({ className = '' }) {
  return (
    <span
      className={`grad-logo inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}
      title="Premium member"
    >
      <IconSparkles className="h-3 w-3" strokeWidth={2.5} />
      Premium
    </span>
  );
}
