import { Link } from 'react-router-dom';
import { IconHandshake, IconSparkles } from './icons.jsx';
import { PremiumPill } from './PremiumBadge.jsx';

/**
 * Free-collaboration quota (v2 §4, §5, §35).
 * Shown to Companies and Creators alike — 3 successful collaborations free,
 * then a subscription is required. Backend is the real enforcer (§36); this
 * just keeps the user informed before they hit the wall.
 */
export default function QuotaCard({ quota, role = 'creator' }) {
  if (!quota) return null;

  // Subscribed users don't need the free-quota nag
  if (quota.subscribed) {
    return (
      <div className="card flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grad-logo grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm">
            <IconSparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink-950 capitalize">{quota.plan} plan</h2>
            <p className="text-sm text-ink-500">
              {quota.unlimited
                ? 'Unlimited collaborations'
                : `${quota.remaining} of ${quota.limit} collaborations left this period`}
            </p>
          </div>
        </div>
        <PremiumPill />
      </div>
    );
  }

  const other = role === 'company' ? 'creators' : 'brands';
  const pct = Math.min(100, Math.round((quota.used / quota.limit) * 100));
  const done = quota.requiresSubscription;

  return (
    <div className={`card p-5 ${done ? 'border-brand-300' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              done ? 'bg-brand-500 text-white' : 'bg-ink-900 text-paper'
            }`}
          >
            <IconHandshake className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink-950">
              {done ? 'Free collaborations used up' : 'Free plan'}
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {done ? (
                role === 'company'
                  ? 'Your 3 free collaborations have been used. Subscribe to continue collaborating with creators.'
                  : 'You have completed your 3 free collaborations. Subscribe to continue collaborating with brands.'
              ) : (
                <>
                  <span className="font-semibold text-ink-800">{quota.remaining}</span> of {quota.limit} free
                  collaborations left — then subscribe to keep working with {other}.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {quota.firstSubscriptionDiscount > 0 && (
            <span className="badge bg-brand-50 text-brand-700">
              {quota.firstSubscriptionDiscount}% off your first plan
            </span>
          )}
          <Link to="/subscribe" className={done ? 'btn-brand' : 'btn-outline'}>
            {done ? 'Subscribe now' : 'View plans'}
          </Link>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-brand-500' : 'bg-ink-900'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
