import { useEffect, useState } from 'react';
import { rankingApi } from '../api/endpoints.js';
import Trophy, { rankTone } from './Trophy.jsx';
import { Spinner } from './ui.jsx';
import { IconAward, IconHistory, IconHandshake } from './icons.jsx';

/**
 * Monthly rank, trophies and history (v2 §14, §15, §35).
 *
 * Shows current rank, progress to the next one, previous month's award, the
 * highest rank ever reached and lifetime collaborations — §14 requires all of
 * these to survive the monthly reset.
 */
export default function RankCard({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rankingApi
      .me()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="card grid h-32 place-items-center p-5">
        <Spinner />
      </div>
    );
  if (!data) return null;

  const { current, previousMonth, highest, lifetimeCollaborations } = data;
  const tone = rankTone(current.key);
  const next = current.next;

  // Progress across the CURRENT band, not from zero — otherwise Gold at 16/26
  // would render as a nearly-full bar the moment it's earned.
  const band = data.ladder?.find((r) => r.key === current.key);
  const bandStart = band?.min ?? 0;
  const span = next ? Math.max(1, next.at - bandStart) : 1;
  const pct = next
    ? Math.min(100, Math.round(((current.completedThisMonth - bandStart) / span) * 100))
    : 100;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Trophy rankKey={current.key} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-display text-xl font-semibold ${tone.label}`}>{current.name}</h2>
              {current.discountPercent > 0 && (
                <span className="badge bg-emerald-100 text-emerald-700">
                  {current.discountPercent}% off subscriptions
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-500">
              {current.completedThisMonth} collaboration
              {current.completedThisMonth === 1 ? '' : 's'} completed this month
            </p>
          </div>
        </div>
        {!compact && (
          <div className="hidden text-right sm:block">
            <div className="font-display text-2xl font-semibold text-ink-950">
              {lifetimeCollaborations}
            </div>
            <div className="text-xs text-ink-400">lifetime</div>
          </div>
        )}
      </div>

      {/* Progress to the next rank */}
      {next ? (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-ink-500">
              {next.remaining} more to reach{' '}
              <span className="font-semibold text-ink-800">{next.name}</span>
            </span>
            <span className="text-ink-400">{next.discountPercent}% off at {next.name}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-ink-900 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
          You have reached the highest rank. Outstanding work.
        </p>
      )}

      {!compact && (
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4">
          <Stat
            icon={IconHistory}
            label="Last month"
            value={previousMonth ? previousMonth.rank : '—'}
            sub={previousMonth ? previousMonth.period : 'No history yet'}
          />
          <Stat icon={IconAward} label="Highest ever" value={highest?.rank || '—'} sub={highest?.period || ''} />
          <Stat
            icon={IconHandshake}
            label="Lifetime"
            value={String(lifetimeCollaborations)}
            sub="collaborations"
          />
        </div>
      )}

      <p className="mt-3 text-xs text-ink-400">
        Rank is earned from collaborations completed this month and resets each month. Your
        achievement history is kept permanently.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-0.5 truncate font-semibold text-ink-900">{value}</div>
      <div className="truncate text-xs text-ink-400">{sub}</div>
    </div>
  );
}
