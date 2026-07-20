import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CampaignCard from '../../components/CampaignCard.jsx';
import CampaignFilters from '../../components/CampaignFilters.jsx';
import { Spinner, EmptyState, Pagination } from '../../components/ui.jsx';
import { campaignApi } from '../../api/endpoints.js';
import Seo from '../../components/Seo.jsx';

export default function BrowsePublic() {
  const [filters, setFilters] = useState({ page: 1, sort: 'latest' });
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    campaignApi
      .browse(params)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Seo title="Browse Influencer Campaigns & Brand Collaborations" description="Browse live influencer marketing campaigns from brands across India. Filter by platform, category, follower range and city, then apply free as a content creator." keywords="influencer campaigns India, brand collaborations, paid creator campaigns, sponsored posts" />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Browse Campaigns</h1>
          <p className="mt-1 text-slate-500">{data.total} opportunities live right now.</p>
        </div>
        <div className="flex gap-2">
          <input
            className="input sm:w-64"
            placeholder="Search campaigns…"
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          />
          <select
            className="input w-auto"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          >
            <option value="latest">Latest</option>
            <option value="popular">Most Popular</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CampaignFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters({ page: 1, sort: 'latest' })}
          />
          <div className="card mt-4 bg-brand-50 p-4 text-center">
            <p className="text-sm text-slate-600">Want to apply?</p>
            <Link to="/register/creator" className="btn-primary mt-2 w-full">
              Join as Creator
            </Link>
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : data.items.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((c) => (
                  <CampaignCard key={c._id} campaign={c} />
                ))}
              </div>
              <Pagination page={filters.page} pages={data.pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
            </>
          ) : (
            <EmptyState title="No campaigns found" subtitle="Try adjusting your filters." />
          )}
        </div>
      </div>
    </div>
  );
}
