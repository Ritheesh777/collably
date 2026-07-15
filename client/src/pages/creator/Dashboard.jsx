import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync.js';
import { creatorApi, campaignApi } from '../../api/endpoints.js';
import { PageLoader, StatCard, StatusBadge, EmptyState } from '../../components/ui.jsx';
import CampaignCard from '../../components/CampaignCard.jsx';
import QuotaCard from '../../components/QuotaCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Stagger, StaggerItem } from '../../lib/motion.jsx';
import { IconSend, IconHandshake, IconClock, IconSearch, IconArrowRight, IconSparkles, IconTrophy } from '../../components/icons.jsx';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => creatorApi.dashboard(), []);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    campaignApi.browse({ limit: 3 }).then((d) => setRecommended(d.items)).catch(() => {});
  }, []);

  if (loading) return <PageLoader />;
  const { stats, recentApplications = [], tier, quota } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Hi {user?.name}</h1>
          <p className="text-ink-500">Find your next brand collaboration.</p>
        </div>
        <Link to="/creator/browse" className="btn-primary">
          <IconSearch className="h-4 w-4" /> Browse Campaigns
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Applications Sent" value={stats?.applicationsSent} icon={IconSend} accent="brand" delay={0} />
        <StatCard label="Accepted" value={stats?.accepted} icon={IconHandshake} accent="emerald" delay={0.05} />
        <StatCard label="Pending" value={stats?.pending} icon={IconClock} accent="amber" delay={0.1} />
      </div>

      <QuotaCard quota={quota} role="creator" />
      {tier && <TierCard tier={tier} />}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
            <IconSparkles className="h-4 w-4 text-brand-500" /> Recommended for you
          </h2>
          <Link to="/creator/browse" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            See more <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recommended.length ? (
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((c) => (
              <StaggerItem key={c._id}>
                <CampaignCard campaign={c} to={`/creator/campaigns/${c._id}`} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState icon={IconSparkles} title="No campaigns yet" subtitle="Check back soon for new opportunities." />
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Recent Applications</h2>
          <Link to="/creator/applications" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            View all <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentApplications.length ? (
          <ul className="divide-y divide-ink-100">
            {recentApplications.map((a) => (
              <li key={a._id} className="flex items-center justify-between py-3">
                <div className="min-w-0 truncate font-medium text-ink-800">{a.campaign?.title || 'Campaign'}</div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={IconSend} title="No applications yet" subtitle="Apply to campaigns to see them here." />
        )}
      </div>
    </div>
  );
}

/**
 * Loyalty tier card — the creator's completed on-platform collaborations
 * unlock a discount on their future subscription (v2 billing).
 */
function TierCard({ tier }) {
  const pct = tier.next
    ? Math.min(100, Math.round((tier.completed / Math.max(tier.next.at, 1)) * 100))
    : 100;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-900 text-paper">
            <IconTrophy className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink-950">{tier.name}</h2>
              {tier.discountPercent > 0 && (
                <span className="badge bg-brand-50 text-brand-700">{tier.discountPercent}% off next plan</span>
              )}
            </div>
            <p className="text-sm text-ink-500">
              {tier.completed} completed collaboration{tier.completed === 1 ? '' : 's'} on InfluConnect
            </p>
          </div>
        </div>
        {tier.next ? (
          <div className="sm:w-64">
            <div className="mb-1 flex justify-between text-xs text-ink-500">
              <span>
                {tier.next.remaining} more → <span className="font-semibold text-ink-800">{tier.next.name}</span>
              </span>
              <span className="font-semibold text-brand-600">{tier.next.discountPercent}% off</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <span className="badge bg-emerald-100 text-emerald-700">Top tier unlocked</span>
        )}
      </div>
      <div className="border-t border-ink-200 bg-ink-50 px-5 py-2.5 text-xs text-ink-500">
        Only collaborations completed on InfluConnect count toward your tier.
      </div>
    </div>
  );
}
