import { IconTrophy } from './icons.jsx';

/**
 * Rank trophy (v2 §15).
 *
 * Metal tones rather than the brand palette — a trophy has to read as Bronze /
 * Silver / Gold at a glance, and the ladder is an ordered scale, so the colours
 * carry meaning the coral accent can't. Unknown ranks (an admin can rename the
 * ladder at will) fall back to neutral ink instead of breaking.
 */
const TONES = {
  rookie: { ring: 'ring-ink-200', bg: 'bg-ink-100', fg: 'text-ink-500', label: 'text-ink-600' },
  bronze: { ring: 'ring-amber-200', bg: 'bg-amber-50', fg: 'text-amber-700', label: 'text-amber-800' },
  silver: { ring: 'ring-slate-200', bg: 'bg-slate-100', fg: 'text-slate-500', label: 'text-slate-700' },
  gold: { ring: 'ring-yellow-200', bg: 'bg-yellow-50', fg: 'text-yellow-600', label: 'text-yellow-800' },
  platinum: { ring: 'ring-teal-200', bg: 'bg-teal-50', fg: 'text-teal-600', label: 'text-teal-800' },
};
const FALLBACK = { ring: 'ring-ink-200', bg: 'bg-ink-100', fg: 'text-ink-500', label: 'text-ink-700' };

export const rankTone = (key) => TONES[String(key || '').toLowerCase()] || FALLBACK;

const SIZES = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11', icon: 'h-5 w-5' },
  lg: { box: 'h-16 w-16', icon: 'h-8 w-8' },
};

export default function Trophy({ rankKey, size = 'md', className = '' }) {
  const t = rankTone(rankKey);
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ring-1 ${t.bg} ${t.ring} ${s.box} ${className}`}
    >
      <IconTrophy className={`${t.fg} ${s.icon}`} strokeWidth={1.75} />
    </span>
  );
}

/** Inline rank chip for profile headers and lists. */
export function RankBadge({ rankKey, name, className = '' }) {
  if (!name) return null;
  const t = rankTone(rankKey);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${t.bg} ${t.ring} ${t.label} ${className}`}
    >
      <IconTrophy className={`h-3.5 w-3.5 ${t.fg}`} strokeWidth={2} />
      {name}
    </span>
  );
}
