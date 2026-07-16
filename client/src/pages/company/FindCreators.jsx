import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync.js';
import { creatorApi } from '../../api/endpoints.js';
import { PageLoader, Avatar, EmptyState, Pagination } from '../../components/ui.jsx';
import { compactNumber } from '../../utils/format.js';
import { CAMPAIGN_CATEGORIES, ALL_PLATFORMS, PLATFORM_LABELS, FOLLOWER_FILTERS } from '../../utils/constants.js';
import { IconVerified, IconUsers, IconPin, IconSearch, PLATFORM_ICON } from '../../components/icons.jsx';
import PremiumBadge from '../../components/PremiumBadge.jsx';

export default function FindCreators() {
  const [filters, setFilters] = useState({ page: 1 });
  const { data, loading } = useAsync(
    () => creatorApi.search(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))),
    [filters]
  );

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  // Follower bracket -> min/max numbers the API understands
  const setFollowers = (e) => {
    const idx = e.target.value;
    setFilters((f) => {
      const next = { ...f, followerBracket: idx, page: 1 };
      if (idx === '') {
        delete next.minFollowers;
        delete next.maxFollowers;
      } else {
        const b = FOLLOWER_FILTERS[Number(idx)];
        next.minFollowers = b.min;
        next.maxFollowers = b.max;
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink-950">Find Creators</h1>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input lg:col-span-2" placeholder="Search name or username…" onChange={set('q')} />
        <select className="input" onChange={set('category')} value={filters.category || ''}>
          <option value="">All categories</option>
          {CAMPAIGN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" onChange={set('platform')} value={filters.platform || ''}>
          <option value="">All platforms</option>
          {ALL_PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
        </select>
        <select className="input" onChange={setFollowers} value={filters.followerBracket ?? ''}>
          <option value="">Any followers</option>
          {FOLLOWER_FILTERS.map((b, i) => (
            <option key={b.label} value={i}>{b.label} followers</option>
          ))}
        </select>
        <input className="input" placeholder="City" onChange={set('city')} />
      </div>

      {loading ? (
        <PageLoader />
      ) : data?.items?.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((c) => {
              const ig = c.socials?.find((s) => s.platform === 'instagram') || c.socials?.[0];
              return (
                <Link key={c._id} to={`/company/creators/${c.user._id}`} className="card card-hover p-5">
                  <div className="flex items-center gap-3">
                    <Avatar src={c.avatarUrl} name={c.fullName} size={48} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-semibold text-ink-900">
                        <span className="truncate">{c.fullName}</span>
                        {c.user?.isAdminVerified && <IconVerified className="h-4 w-4 shrink-0 text-brand-600" />}
                        {c.premium && <PremiumBadge size={16} />}
                      </div>
                      <div className="truncate text-xs text-ink-400">@{c.username}</div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-ink-500">{c.bio || 'Content creator'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="chip"><IconUsers className="h-3.5 w-3.5" /> {compactNumber(c.totalFollowers)}</span>
                    {ig && (() => { const PIcon = PLATFORM_ICON[ig.platform] || PLATFORM_ICON.default; return <span className="chip"><PIcon className="h-3.5 w-3.5" /> {PLATFORM_LABELS[ig.platform]}</span>; })()}
                    <span className="chip"><IconPin className="h-3.5 w-3.5" /> {c.city || '—'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination page={filters.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </>
      ) : (
        <EmptyState icon={IconSearch} title="No creators found" subtitle="Try broadening your filters." />
      )}
    </div>
  );
}
