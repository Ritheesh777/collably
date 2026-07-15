import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { companyApi, rankingApi } from '../../api/endpoints.js';
import { Avatar, PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';
import LockedContact from '../../components/LockedContact.jsx';
import { RankBadge } from '../../components/Trophy.jsx';
import { formatDate } from '../../utils/format.js';
import {
  IconCompany, IconPin, IconGlobe, IconVerified, IconStar, IconBriefcase, IconHandshake,
  IconMail, IconPhone,
} from '../../components/icons.jsx';

/**
 * Company profile as seen by a creator (v2 §22, §23).
 *
 * Companies already had `/company/creators/:id` to inspect a creator, but a
 * creator had nowhere to open a company — so clicking a logo in chat had no
 * destination. Contact details stay masked by the API until a collaboration is
 * accepted (§19/§21); this page never tries to reveal them itself.
 */
export default function CompanyView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    companyApi
      .public(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    rankingApi.user(id).then(setRank).catch(() => setRank(null));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!data)
    return <EmptyState icon={IconCompany} title="Company not found" subtitle="This profile is unavailable." />;

  const { profile, contact, contactUnlocked, reviews } = data;
  const u = profile.user || {};

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {profile.bannerUrl && (
        <div className="h-40 w-full overflow-hidden rounded-2xl border border-ink-200">
          <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={profile.logoUrl} name={u.name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-ink-950">{u.name}</h1>
              {/* §17/§18 — the verification badge and the collaboration
                  indicator are deliberately different things. */}
              {u.isAdminVerified && (
                <span className="badge inline-flex items-center gap-1 bg-sky-50 text-sky-700">
                  <IconVerified className="h-3.5 w-3.5" /> Verified company
                </span>
              )}
              {contactUnlocked && (
                <span className="badge inline-flex items-center gap-1 bg-emerald-50 text-emerald-700">
                  <IconHandshake className="h-3.5 w-3.5" /> Collaborating
                </span>
              )}
              {rank?.current?.name && <RankBadge rankKey={rank.current.key} name={rank.current.name} />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              {profile.industry && (
                <span className="inline-flex items-center gap-1.5">
                  <IconBriefcase className="h-3.5 w-3.5" /> {profile.industry}
                </span>
              )}
              {(profile.city || profile.country) && (
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="h-3.5 w-3.5" />
                  {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                </span>
              )}
              {u.createdAt && <span>Joined {formatDate(u.createdAt)}</span>}
            </div>
          </div>
        </div>

        {profile.description && (
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-700">{profile.description}</p>
        )}
      </div>

      {/* §19/§21 — the API masks these until a collaboration is accepted, so
          there is nothing real in the DOM to un-blur. */}
      {contactUnlocked ? (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-ink-950">Contact</h2>
          <div className="space-y-2 text-sm">
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-ink-700 hover:underline">
                <IconMail className="h-4 w-4 text-ink-400" /> {contact.email}
              </a>
            )}
            {contact?.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-ink-700 hover:underline">
                <IconPhone className="h-4 w-4 text-ink-400" /> {contact.phone}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 text-ink-700 hover:underline"
              >
                <IconGlobe className="h-4 w-4 text-ink-400" /> {profile.website}
              </a>
            )}
          </div>
        </div>
      ) : (
        <LockedContact contact={contact} role="company" />
      )}

      {rank && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-ink-950">Track record</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Fact label="Current rank" value={rank.current?.name || '—'} />
            <Fact label="Highest ever" value={rank.highest?.rank || '—'} />
            <Fact label="Collaborations" value={String(rank.lifetimeCollaborations ?? 0)} />
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink-950">
          <IconStar className="h-4 w-4 text-ink-400" /> Reviews from creators
        </h2>
        {reviews?.length ? (
          <ul className="divide-y divide-ink-100">
            {reviews.map((r) => (
              <li key={r._id} className="py-3">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/creators/${r.author?._id}`}
                    className="font-medium text-ink-900 hover:underline"
                  >
                    {r.author?.name || 'Creator'}
                  </Link>
                  <span className="text-sm font-semibold text-ink-800">{r.rating}/5</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-ink-600">{r.comment}</p>}
                <div className="mt-1 text-xs text-ink-400">{formatDate(r.createdAt)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <div className="text-xs text-ink-400">{label}</div>
      <div className="mt-0.5 font-semibold text-ink-900">{value}</div>
    </div>
  );
}
