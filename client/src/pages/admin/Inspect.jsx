import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/endpoints.js';
import { PageLoader, Avatar, StatusBadge, EmptyState } from '../../components/ui.jsx';
import { RankBadge } from '../../components/Trophy.jsx';
import { formatDate } from '../../utils/format.js';
import {
  IconCompany, IconUser, IconCampaign, IconHandshake, IconStar, IconFlag, IconVerified,
  IconArrowLeft, IconChevronRight, IconNetwork, IconTrophy, IconCard,
} from '../../components/icons.jsx';

/**
 * Admin relationship inspection (v2 §29–§32).
 *
 * The client asked to click a company or creator and see everything, with every
 * related entity clickable:  Campaign → Company → Creator Collaborations →
 * Creator Profile.  BR-NEW-016 limits this cross-platform history to admins.
 */
export default function Inspect({ kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fn =
      kind === 'company' ? adminApi.inspectCompany : kind === 'creator' ? adminApi.inspectCreator : adminApi.inspectCampaign;
    fn(id)
      .then(setD)
      .catch((e) => {
        toast.error(e.message);
        setD(null);
      })
      .finally(() => setLoading(false));
  }, [kind, id]);

  if (loading) return <PageLoader />;
  if (!d) return <EmptyState icon={IconNetwork} title="Not found" subtitle="This record is unavailable." />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
        <IconArrowLeft className="h-4 w-4" /> Back
      </button>
      {kind === 'company' && <CompanyInspect d={d} />}
      {kind === 'creator' && <CreatorInspect d={d} />}
      {kind === 'campaign' && <CampaignInspect d={d} />}
    </div>
  );
}

/* ─────────────────────────────── §29 Company ─────────────────────────────── */
function CompanyInspect({ d }) {
  const { user, profile, accountStatus, campaigns, campaignStats, collaborationStats, partners, complaints, reviews, quota, subscription, ranking, payments } = d;
  return (
    <>
      <Header user={user} profile={profile} accountStatus={accountStatus} ranking={ranking} icon={IconCompany} subtitle={profile?.industry} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Campaigns" value={campaignStats.total} />
        <Stat label="Active" value={campaignStats.active} />
        <Stat label="Collaborations" value={collaborationStats.total} />
        <Stat label="Completed" value={collaborationStats.completed} />
      </div>

      <Billing quota={quota} subscription={subscription} payments={payments} />

      {/* §29/§32 — creators collaborated with, each clickable */}
      <Panel icon={IconHandshake} title={`Creators collaborated with (${partners.length})`}>
        {partners.length === 0 ? (
          <Empty>No collaborations yet.</Empty>
        ) : (
          <ul className="divide-y divide-ink-100">
            {partners.map((p) => (
              <PartnerRow key={p._id} p={p} to={`/admin/creator/${p._id}`} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon={IconCampaign} title={`Campaigns (${campaigns.length})`}>
        {campaigns.length === 0 ? (
          <Empty>No campaigns posted.</Empty>
        ) : (
          <ul className="divide-y divide-ink-100">
            {campaigns.map((c) => (
              <li key={c._id}>
                <Link to={`/admin/campaign/${c._id}`} className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-ink-50">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-900">{c.title}</div>
                    <div className="text-xs text-ink-400">
                      {c.category} · {c.applications} application{c.applications === 1 ? '' : 's'} · {c.viewsCount || 0} views
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={c.status} />
                    <IconChevronRight className="h-4 w-4 text-ink-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Complaints complaints={complaints} />
      <Reviews reviews={reviews} />
    </>
  );
}

/* ─────────────────────────────── §30 Creator ─────────────────────────────── */
function CreatorInspect({ d }) {
  const { user, profile, accountStatus, collaborationStats, partners, applications, complaints, reviews, quota, subscription, ranking, rankHistory, payments } = d;
  return (
    <>
      <Header user={user} profile={profile} accountStatus={accountStatus} ranking={ranking} icon={IconUser} subtitle={profile?.bio} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Collaborations" value={collaborationStats.total} />
        <Stat label="Active" value={collaborationStats.active} />
        <Stat label="Completed" value={collaborationStats.completed} />
        <Stat label="Applications" value={applications.length} />
      </div>

      {/* §30 — platform + follower information */}
      {profile?.socials?.length > 0 && (
        <Panel icon={IconNetwork} title="Platforms">
          <ul className="divide-y divide-ink-100">
            {profile.socials.map((s, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium capitalize text-ink-800">{s.platform}</span>
                <span className="text-ink-500">
                  {s.handle && <span className="mr-3 font-mono text-xs">{s.handle}</span>}
                  {(s.followers || 0).toLocaleString('en-IN')} followers
                  {s.engagementRate ? ` · ${s.engagementRate}% eng.` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* §30 — current monthly rank, previous ranks, highest achievement */}
      <Panel icon={IconTrophy} title="Ranking history">
        <div className="grid grid-cols-3 gap-3 pb-3 text-sm">
          <Fact label="This month" value={ranking?.current?.name || '—'} />
          <Fact label="Previous" value={ranking?.previousMonth?.rank || '—'} />
          <Fact label="Highest ever" value={ranking?.highest?.rank || '—'} />
        </div>
        {rankHistory?.length > 0 && (
          <ul className="divide-y divide-ink-100 border-t border-ink-100">
            {rankHistory.map((h) => (
              <li key={h._id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-xs text-ink-500">{h.period}</span>
                <span className="text-ink-700">
                  {h.rankName} · {h.completed} completed
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Billing quota={quota} subscription={subscription} payments={payments} />

      {/* §30/§32 — companies collaborated with, each clickable */}
      <Panel icon={IconHandshake} title={`Companies collaborated with (${partners.length})`}>
        {partners.length === 0 ? (
          <Empty>No collaborations yet.</Empty>
        ) : (
          <ul className="divide-y divide-ink-100">
            {partners.map((p) => (
              <PartnerRow key={p._id} p={p} to={`/admin/company/${p._id}`} />
            ))}
          </ul>
        )}
      </Panel>

      <Complaints complaints={complaints} />
      <Reviews reviews={reviews} />
    </>
  );
}

/* ────────────────────────────── §31 Campaign ─────────────────────────────── */
function CampaignInspect({ d }) {
  const { campaign, company, applications, applicationStats, collaborations, complaints } = d;
  return (
    <>
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-ink-950">{campaign.title}</h1>
            <div className="mt-1 text-sm text-ink-500">
              {campaign.category} · {campaign.campaignType} · deadline {formatDate(campaign.deadline)}
            </div>
          </div>
          <StatusBadge status={campaign.status} />
        </div>
        {campaign.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{campaign.description}</p>
        )}
      </div>

      {/* §31 — the company that created it, clickable */}
      <Panel icon={IconCompany} title="Posted by">
        <Link to={`/admin/company/${company._id}`} className="flex items-center gap-3 py-2 transition hover:bg-ink-50">
          <Avatar src={company.avatarUrl} name={company.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink-900">{company.name}</span>
              {company.isAdminVerified && <IconVerified className="h-4 w-4 shrink-0 text-sky-600" />}
            </div>
            <div className="truncate text-xs text-ink-400">
              {company.email} · {company.profile?.industry || 'Company'}
            </div>
          </div>
          <IconChevronRight className="h-4 w-4 text-ink-300" />
        </Link>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Applications" value={applicationStats.total} />
        <Stat label="Pending" value={applicationStats.pending} />
        <Stat label="Accepted" value={applicationStats.accepted} />
        <Stat label="Rejected" value={applicationStats.rejected} />
      </div>

      <Panel icon={IconUser} title={`Applications (${applications.length})`}>
        {applications.length === 0 ? (
          <Empty>Nobody has applied yet.</Empty>
        ) : (
          <ul className="divide-y divide-ink-100">
            {applications.map((a) => (
              <li key={a._id}>
                <Link to={`/admin/creator/${a.creator?._id}`} className="flex items-center gap-3 py-2.5 transition hover:bg-ink-50">
                  <Avatar src={a.creator?.avatarUrl} name={a.creator?.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink-900">{a.creator?.name}</div>
                    <div className="truncate text-xs text-ink-400">{a.message || 'No message'}</div>
                  </div>
                  <StatusBadge status={a.status} />
                  <IconChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* §31 — collaborations created from this campaign */}
      <Panel icon={IconHandshake} title={`Collaborations (${collaborations.length})`}>
        {collaborations.length === 0 ? (
          <Empty>No collaborations from this campaign.</Empty>
        ) : (
          <ul className="divide-y divide-ink-100">
            {collaborations.map((c) => (
              <li key={c._id}>
                <Link to={`/admin/creator/${c.creator?._id}`} className="flex items-center gap-3 py-2.5 transition hover:bg-ink-50">
                  <Avatar src={c.creator?.avatarUrl} name={c.creator?.name} size={36} />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{c.creator?.name}</span>
                  <StatusBadge status={c.status} />
                  <IconChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Complaints complaints={{ by: [], against: complaints }} />
    </>
  );
}

/* ──────────────────────────────── shared ─────────────────────────────────── */
function Header({ user, profile, accountStatus, ranking, icon: Icon, subtitle }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar src={user.avatarUrl} name={user.name} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-ink-950">{user.name}</h1>
            {/* §17/§18 — verification and collaboration status are separate concepts */}
            {user.isAdminVerified && (
              <span className="badge inline-flex items-center gap-1 bg-sky-50 text-sky-700">
                <IconVerified className="h-3.5 w-3.5" /> Verified
              </span>
            )}
            {ranking?.current?.name && <RankBadge rankKey={ranking.current.key} name={ranking.current.name} />}
            <StatusBadge status={accountStatus.status === 'active' ? 'active' : accountStatus.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" /> {user.email}
            </span>
            {(profile?.city || profile?.country) && (
              <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
            )}
          </div>
          {subtitle && <p className="mt-2 line-clamp-2 text-sm text-ink-600">{subtitle}</p>}
          {accountStatus.deletedAt && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
              Account deleted on {formatDate(accountStatus.deletedAt)}. Records retained for audit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Billing({ quota, subscription, payments }) {
  const active = subscription?.status === 'active' && new Date(subscription.expiresAt) > new Date();
  return (
    <Panel icon={IconCard} title="Subscription">
      <div className="grid grid-cols-3 gap-3 pb-3 text-sm">
        <Fact label="Plan" value={active ? subscription.plan : 'Free'} />
        <Fact
          label="Free collabs"
          value={quota?.unlimited ? 'Unlimited' : `${quota?.used ?? 0} / ${quota?.limit ?? 3}`}
        />
        <Fact label="Expires" value={active ? formatDate(subscription.expiresAt) : '—'} />
      </div>
      {payments?.length > 0 && (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {payments.slice(0, 5).map((p) => (
            <li key={p._id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-600">
                {p.planCode} · {formatDate(p.createdAt)}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-ink-800">₹{(p.amountPaise / 100).toFixed(2)}</span>
                <StatusBadge status={p.status === 'paid' ? 'accepted' : p.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PartnerRow({ p, to }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 py-2.5 transition hover:bg-ink-50">
        <Avatar src={p.avatarUrl} name={p.name} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink-900">{p.name}</span>
            {p.isAdminVerified && <IconVerified className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
          </div>
          <div className="truncate text-xs text-ink-400">
            {p.collaborations} collaboration{p.collaborations === 1 ? '' : 's'}
            {p.active > 0 && ` · ${p.active} active`}
            {p.completed > 0 && ` · ${p.completed} completed`}
          </div>
          {p.campaigns?.length > 0 && (
            <div className="truncate text-[11px] text-ink-400">
              {p.campaigns.map((c) => c.title).filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <IconChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
      </Link>
    </li>
  );
}

function Complaints({ complaints }) {
  const total = (complaints?.by?.length || 0) + (complaints?.against?.length || 0);
  return (
    <Panel icon={IconFlag} title={`Complaints (${total})`}>
      {total === 0 ? (
        <Empty>No complaints.</Empty>
      ) : (
        <ul className="divide-y divide-ink-100">
          {complaints.against?.map((c) => (
            <li key={c._id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-rose-700">Reported by {c.reporter?.name || 'someone'}</span>
                <StatusBadge status={c.status === 'resolved' ? 'accepted' : 'pending'} />
              </div>
              <div className="text-xs text-ink-500">
                {c.reason}
                {c.description ? ` — ${c.description}` : ''}
              </div>
              <div className="text-xs text-ink-400">{formatDate(c.createdAt)}</div>
            </li>
          ))}
          {complaints.by?.map((c) => (
            <li key={c._id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-700">
                  Reported {c.targetUser?.name || c.targetCampaign?.title || 'someone'}
                </span>
                <StatusBadge status={c.status === 'resolved' ? 'accepted' : 'pending'} />
              </div>
              <div className="text-xs text-ink-500">{c.reason}</div>
              <div className="text-xs text-ink-400">{formatDate(c.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Reviews({ reviews }) {
  return (
    <Panel icon={IconStar} title={`Reviews (${reviews?.length || 0})`}>
      {!reviews?.length ? (
        <Empty>No reviews.</Empty>
      ) : (
        <ul className="divide-y divide-ink-100">
          {reviews.map((r) => (
            <li key={r._id} className="py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-700">
                  <span className="font-medium">{r.author?.name}</span>
                  <span className="text-ink-400"> → </span>
                  <span className="font-medium">{r.subject?.name}</span>
                </span>
                <span className="text-sm font-semibold text-ink-800">{r.rating}/5</span>
              </div>
              {r.comment && <p className="mt-0.5 text-xs text-ink-500">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="card p-5">
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink-950">
        <Icon className="h-4 w-4 text-ink-400" /> {title}
      </h2>
      {children}
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="card p-3 text-center">
    <div className="font-display text-2xl font-semibold text-ink-950">{value}</div>
    <div className="text-xs text-ink-400">{label}</div>
  </div>
);

const Fact = ({ label, value }) => (
  <div>
    <div className="text-xs text-ink-400">{label}</div>
    <div className="mt-0.5 truncate font-semibold capitalize text-ink-900">{value}</div>
  </div>
);

const Empty = ({ children }) => <p className="py-2 text-sm text-ink-500">{children}</p>;
