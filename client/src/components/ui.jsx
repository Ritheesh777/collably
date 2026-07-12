import { initials } from '../utils/format.js';
import { STATUS_STYLES } from '../utils/constants.js';
import { IconSpinner, IconInbox, IconStar, IconX } from './icons.jsx';
import { motion } from '../lib/motion.jsx';
import { AnimatePresence } from 'framer-motion';

export function Spinner({ className = 'h-5 w-5' }) {
  return <IconSpinner className={`animate-spin text-brand-600 ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

/** Card skeleton grid for loading states — feels faster than a spinner. */
export function SkeletonCards({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden p-0">
          <div className="skeleton h-28 rounded-none" />
          <div className="space-y-3 p-4">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge capitalize ${STATUS_STYLES[status] || 'bg-ink-100 text-ink-600'}`}>
      {status}
    </span>
  );
}

export function Avatar({ src, name = '', size = 40, className = '', ring = false }) {
  const dim = { width: size, height: size };
  const ringCls = ring ? 'ring-2 ring-white shadow-soft' : '';
  if (src)
    return <img src={src} alt={name} style={dim} className={`rounded-full object-cover ${ringCls} ${className}`} />;
  return (
    <div
      style={{ ...dim, fontSize: size * 0.36 }}
      className={`flex items-center justify-center rounded-full bg-brand-gradient font-semibold text-white ${ringCls} ${className}`}
    >
      {initials(name) || '?'}
    </div>
  );
}

export function EmptyState({ icon: Icon = IconInbox, title, subtitle, action }) {
  const Glyph = typeof Icon === 'function' ? Icon : IconInbox;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/50 px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Glyph className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-ink-500">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children, required }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-accent-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-accent-600">{error}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`glass-strong w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl shadow-lift sm:rounded-2xl`}
          >
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600" aria-label="Close">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-ink-200 px-5 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StarRating({ value = 0, size = 16, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= Math.round(value);
        return (
          <button
            key={s}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(s)}
            className={onChange ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
          >
            <IconStar
              className={filled ? 'text-amber-400' : 'text-ink-200'}
              fill={filled ? 'currentColor' : 'none'}
              style={{ width: size, height: size }}
              strokeWidth={filled ? 0 : 1.8}
            />
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button className="btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </button>
      <span className="text-sm text-ink-500">
        Page <span className="font-semibold text-ink-800">{page}</span> of {pages}
      </span>
      <button className="btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = 'brand', delay = 0 }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="card card-hover group flex items-center gap-4 p-4"
    >
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${colors[accent]}`}>
        {Icon && <Icon className="h-5 w-5" strokeWidth={2} />}
      </div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold text-ink-900">{value ?? 0}</div>
        <div className="truncate text-xs font-medium text-ink-500">{label}</div>
      </div>
    </motion.div>
  );
}
