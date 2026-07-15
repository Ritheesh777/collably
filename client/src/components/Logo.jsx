import { Link } from 'react-router-dom';

/**
 * The Collably mark: a "C" enclosing two figures (brand + creator) with a spark.
 *
 * Served as a PNG from /public rather than inlined — it is a gradient-heavy
 * raster, so inlining it as a data URI would bloat every bundle that imports
 * this component. The browser caches it once and reuses it everywhere.
 */
export function LogoMark({ size = 34, className = '' }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      width={size}
      height={size}
      // width/height above reserve the space so the header doesn't reflow while
      // the image loads; eager because the logo is always above the fold.
      loading="eager"
      decoding="async"
      className={`shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export default function Logo({ to = '/', light = false, size = 34 }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5" aria-label="Collably home">
      <span className="transition-transform duration-200 group-hover:scale-105">
        <LogoMark size={size} />
      </span>
      <span
        className={`font-display text-lg font-bold tracking-tight ${
          light ? 'text-white' : 'text-ink-950'
        }`}
      >
        {/* The mark already carries the colour; a gradient wordmark next to it
            fought for attention, so the name stays in plain ink. */}
        Collably
      </span>
    </Link>
  );
}
