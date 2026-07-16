import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAsync } from '../../hooks/useAsync.js';
import { creatorApi, campaignApi, applicationApi } from '../../api/endpoints.js';
import { PageLoader, Avatar, StarRating, Modal, EmptyState } from '../../components/ui.jsx';
import Linkify from '../../components/Linkify.jsx';
import LockedContact from '../../components/LockedContact.jsx';
import { compactNumber } from '../../utils/format.js';
import { socialUrl } from '../../utils/social.js';
import { PLATFORM_LABELS } from '../../utils/constants.js';
import PremiumBadge from '../../components/PremiumBadge.jsx';
import {
  IconArrowLeft, IconArrowRight, IconVerified, IconPin, IconMail, IconUser,
  IconVideo, IconFile, IconExternal, PLATFORM_ICON,
} from '../../components/icons.jsx';

export default function CreatorView() {
  const { id } = useParams();
  const { data, loading } = useAsync(() => creatorApi.public(id), [id]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [invite, setInvite] = useState({ campaignId: '', message: '' });
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (!data?.profile) return <EmptyState icon={IconUser} title="Creator not found" />;

  const { profile, reviews, contactUnlocked, contact } = data;

  const openInvite = async () => {
    setInviteOpen(true);
    try {
      const res = await campaignApi.mine({ status: 'active' });
      setCampaigns(res.items);
      if (res.items[0]) setInvite((v) => ({ ...v, campaignId: res.items[0]._id }));
    } catch {
      /* ignore */
    }
  };

  const sendInvite = async () => {
    if (!invite.campaignId) return toast.error('Select a campaign');
    setBusy(true);
    try {
      await applicationApi.invite({ campaignId: invite.campaignId, creatorId: id, message: invite.message });
      toast.success('Invitation sent!');
      setInviteOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/company/creators" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-600">
        <IconArrowLeft className="h-4 w-4" /> Back to creators
      </Link>

      <div className="card p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatarUrl} name={profile.fullName} size={72} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-ink-950">{profile.fullName}</h1>
                {profile.user?.isAdminVerified && <IconVerified className="h-5 w-5 text-brand-600" title="Verified" />}
                {data.premium && <PremiumBadge size={22} />}
              </div>
              <div className="text-sm text-ink-400">@{profile.username}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-ink-500">
                <StarRating value={profile.ratingAvg} /> ({profile.ratingCount})
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={openInvite}><IconMail className="h-4 w-4" /> Invite to Campaign</button>
        </div>
        {profile.bio && <p className="mt-4 text-ink-700"><Linkify text={profile.bio} /></p>}
        <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-500">
          <IconPin className="h-4 w-4 shrink-0" />
          <Linkify text={[profile.city, profile.state, profile.country].filter(Boolean).join(', ') || '—'} />
        </div>
      </div>

      {/* Contact stays locked until the collaboration is accepted (§5) */}
      {!contactUnlocked && (
        <LockedContact contact={contact} socials={profile.socials} role="creator" />
      )}

      <Section title="Social Accounts">
        {profile.socials?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.socials.map((s) => {
              const PIcon = PLATFORM_ICON[s.platform] || PLATFORM_ICON.default;
              const url = contactUnlocked ? socialUrl(s.platform, s.username) : '';
              return (
                <div key={s._id || s.platform} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-ink-800">
                      <PIcon className="h-4 w-4 text-brand-600" /> {PLATFORM_LABELS[s.platform] || s.platform}
                    </span>
                    {s.verified && <span className="badge bg-emerald-100 text-emerald-700">Verified</span>}
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                    >
                      @{String(s.username).replace(/^@/, '')} <IconExternal className="h-3 w-3" />
                    </a>
                  ) : (
                    <div className="mt-1 select-none font-mono text-sm text-ink-400 blur-[3px]" aria-hidden="true">
                      @************
                    </div>
                  )}
                  <div className="mt-3 flex gap-4 text-sm">
                    <div><span className="font-bold text-ink-900">{compactNumber(s.followers)}</span> <span className="text-ink-400">followers</span></div>
                    {s.avgViews > 0 && <div><span className="font-bold text-ink-900">{compactNumber(s.avgViews)}</span> <span className="text-ink-400">avg views</span></div>}
                    {s.engagementRate > 0 && <div><span className="font-bold text-ink-900">{s.engagementRate}%</span> <span className="text-ink-400">eng.</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ink-400">No linked accounts yet.</p>
        )}
      </Section>

      <Section title="Portfolio">
        {profile.portfolio?.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.portfolio.map((p) => (
              <a key={p._id} href={p.url} target="_blank" rel="noreferrer" className="card overflow-hidden">
                {p.type === 'image' ? (
                  <img src={p.url} alt={p.title} className="h-32 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-32 place-items-center bg-ink-100 text-ink-400">
                    {p.type === 'video' ? <IconVideo className="h-8 w-8" /> : <IconFile className="h-8 w-8" />}
                  </div>
                )}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">No portfolio items yet.</p>
        )}
        {contactUnlocked && profile.mediaKitUrl && (
          <a href={profile.mediaKitUrl} target="_blank" rel="noreferrer" className="btn-outline mt-3"><IconFile className="h-4 w-4" /> View Media Kit</a>
        )}
      </Section>

      <Section title={`Reviews (${reviews?.length || 0})`}>
        {reviews?.length ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-800">{r.author?.name}</span>
                  <StarRating value={r.rating} />
                </div>
                {r.comment && <p className="mt-2 text-sm text-ink-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">No reviews yet.</p>
        )}
      </Section>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite to Campaign"
        footer={
          <>
            <button className="btn-outline" onClick={() => setInviteOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={sendInvite} disabled={busy}>{busy ? 'Sending…' : 'Send Invite'}</button>
          </>
        }
      >
        {campaigns.length ? (
          <div className="space-y-4">
            <div>
              <label className="label">Select campaign</label>
              <select className="input" value={invite.campaignId} onChange={(e) => setInvite({ ...invite, campaignId: e.target.value })}>
                {campaigns.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Message (optional)</label>
              <textarea className="input min-h-[90px]" value={invite.message} onChange={(e) => setInvite({ ...invite, message: e.target.value })} placeholder="Tell them why they're a great fit…" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-500">
            You have no active campaigns.{' '}
            <Link to="/company/campaigns/new" className="inline-flex items-center gap-1 text-brand-600">
              Create one first <IconArrowRight className="h-3 w-3" />
            </Link>
          </p>
        )}
      </Modal>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-ink-900">{title}</h2>
      {children}
    </div>
  );
}
