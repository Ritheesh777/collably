import { Link } from 'react-router-dom';

/**
 * Custom Collably mark: two interlocking nodes (brand + creator) joined by a
 * link — drawn as SVG, no emoji, crisp at any size.
 */
export function LogoMark({ size = 34, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1a1713" />
      <circle cx="15" cy="20" r="5.4" stroke="#f4f0e7" strokeWidth="2.4" />
      <circle cx="25" cy="20" r="5.4" stroke="#d9542f" strokeWidth="2.4" />
      <path d="M18.2 20h3.6" stroke="#d9542f" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = '/', light = false, size = 34 }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5">
      <span className="transition-transform duration-200 group-hover:scale-105">
        <LogoMark size={size} />
      </span>
      <span
        className={`font-display text-lg font-700 font-bold tracking-tight ${
          light ? 'text-white' : 'text-ink-950'
        }`}
      >
        {/* Split for the two-tone treatment — keep it as one word to a reader.
            Written this way the literal "Collably" never appears in source, so
            a brand rename must come through here deliberately. */}
        Colla<span className="text-gradient">bly</span>
      </span>
    </Link>
  );
}
