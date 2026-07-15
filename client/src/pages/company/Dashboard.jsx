import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync.js';
import { companyApi } from '../../api/endpoints.js';
import { PageLoader, StatCard, StatusBadge, EmptyState } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import QuotaCard from '../../components/QuotaCard.jsx';
import { timeAgo } from '../../utils/format.js';
import { IconCampaign, IconInbox, IconHandshake, IconTrending, IconPlus, IconArrowRight } from '../../components/icons.jsx';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => companyApi.dashboard(), []);
  if (loading) return <PageLoader />;

  const { stats, recentCampaigns = [], recentApplications = [], quota } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">Welcome back, {user?.name}</h1>
          <p className="text-ink-500">Here's what's happening with your campaigns.</p>
        </div>
        <Link to="/company/campaigns/new" className="btn-primary">
          <IconPlus className="h-4 w-4" /> Create New Campaign
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Campaigns" value={stats?.activeCampaigns} icon={IconCampaign} accent="brand" delay={0} />
        <StatCard label="Pending Applications" value={stats?.pendingApplications} icon={IconInbox} accent="amber" delay={0.05} />
        <StatCard label="Accepted Creators" value={stats?.acceptedCreators} icon={IconHandshake} accent="emerald" delay={0.1} />
        <StatCard label="Total Campaigns" value={stats?.totalCampaigns} icon={IconTrending} accent="rose" delay={0.15} />
      </div>

      <QuotaCard quota={quota} role="company" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Recent Campaigns</h2>
            <Link to="/company/campaigns" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
              View all <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentCampaigns.length ? (
            <ul className="divide-y divide-ink-100">
              {recentCampaigns.map((c) => (
                <li key={c._id} className="flex items-center justify-between py-3">
                  <Link to={`/company/campaigns/${c._id}`} className="min-w-0">
                    <div className="truncate font-medium text-ink-800">{c.title}</div>
                    <div className="text-xs text-ink-400">{c.applicationsCount} applications</div>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={IconCampaign} title="No campaigns yet" subtitle="Create your first campaign to get started." action={<Link to="/company/campaigns/new" className="btn-primary">Create Campaign</Link>} />
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Recent Applications</h2>
            <Link to="/company/applications" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
              View all <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentApplications.length ? (
            <ul className="divide-y divide-ink-100">
              {recentApplications.map((a) => (
                <li key={a._id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-800">{a.creator?.name}</div>
                    <div className="truncate text-xs text-ink-400">{a.campaign?.title} · {timeAgo(a.createdAt)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={IconInbox} title="No applications yet" subtitle="Applications will appear here once creators apply." />
          )}
        </div>
      </div>
    </div>
  );
}
