import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAsync } from '../../hooks/useAsync.js';
import { creatorApi } from '../../api/endpoints.js';
import { PageLoader, Field, Avatar, StarRating } from '../../components/ui.jsx';
import SocialsEditor from '../../components/SocialsEditor.jsx';
import { compactNumber } from '../../utils/format.js';
import { IconEdit, IconUsers, IconVideo, IconFile, IconX, IconPlus, IconUpload } from '../../components/icons.jsx';
import PremiumBadge from '../../components/PremiumBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CreatorProfile() {
  const { data, loading, reload } = useAsync(() => creatorApi.me(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const profile = data?.profile;
  if (loading || !profile) return <PageLoader />;
  const model = form || profile;
  const set = (k) => (e) => setForm({ ...model, [k]: e.target.value });

  const saveBasics = async () => {
    setBusy(true);
    try {
      await creatorApi.update({
        fullName: model.fullName,
        bio: model.bio,
        city: model.city,
        state: model.state,
        country: model.country,
        categories: model.categories,
      });
      toast.success('Profile saved');
      setForm(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (kind, file) => {
    const fd = new FormData();
    if (kind === 'avatar') {
      fd.append('avatar', file);
      await creatorApi.updateAvatar(fd);
    } else if (kind === 'mediakit') {
      fd.append('file', file);
      await creatorApi.updateMediaKit(fd);
    }
    toast.success('Uploaded');
    reload();
  };

  const addPortfolio = async (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    try {
      await creatorApi.addPortfolio(fd);
      toast.success('Added to portfolio');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removePortfolio = async (itemId) => {
    await creatorApi.removePortfolio(itemId);
    reload();
  };

  const saveSocials = async (socials) => {
    try {
      await creatorApi.updateSocials(socials);
      toast.success('Social accounts saved');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={profile.avatarUrl} name={profile.fullName} size={72} />
            <label className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-brand-600 text-white shadow-soft">
              <IconEdit className="h-3.5 w-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && upload('avatar', e.target.files[0])} />
            </label>
          </div>
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-ink-900">
              {profile.fullName}
              <PremiumHint />
            </div>
            <div className="text-sm text-ink-400">@{profile.username}</div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <StarRating value={profile.ratingAvg} /> <span className="text-ink-400">({profile.ratingCount})</span>
              <span className="chip"><IconUsers className="h-3.5 w-3.5" /> {compactNumber(profile.totalFollowers)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <h2 className="font-semibold text-slate-800">Basic Info</h2>
        <Field label="Full Name"><input className="input" value={model.fullName || ''} onChange={set('fullName')} /></Field>
        <Field label="Bio"><textarea className="input min-h-[90px]" value={model.bio || ''} onChange={set('bio')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City"><input className="input" value={model.city || ''} onChange={set('city')} /></Field>
          <Field label="State"><input className="input" value={model.state || ''} onChange={set('state')} /></Field>
          <Field label="Country"><input className="input" value={model.country || ''} onChange={set('country')} /></Field>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={saveBasics} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-slate-800">Social Accounts</h2>
        <SocialsEditor initial={profile.socials} onSave={saveSocials} />
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Portfolio</h2>
          <label className="btn-outline cursor-pointer text-xs">
            <IconPlus className="h-3.5 w-3.5" /> Add
            <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(e) => e.target.files.length && addPortfolio(e.target.files)} />
          </label>
        </div>
        {profile.portfolio?.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.portfolio.map((p) => (
              <div key={p._id} className="group relative overflow-hidden rounded-xl border border-ink-100">
                {p.type === 'image' ? (
                  <img src={p.url} alt="" className="h-28 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-28 place-items-center bg-ink-100 text-ink-400">
                    {p.type === 'video' ? <IconVideo className="h-7 w-7" /> : <IconFile className="h-7 w-7" />}
                  </div>
                )}
                <button onClick={() => removePortfolio(p._id)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink-950/60 text-white opacity-0 transition group-hover:opacity-100">
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">No portfolio items yet. Add your best work.</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <label className="btn-outline cursor-pointer text-sm">
            <IconUpload className="h-4 w-4" /> Upload Media Kit (PDF)
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files[0] && upload('mediakit', e.target.files[0])} />
          </label>
          {profile.mediaKitUrl && <a href={profile.mediaKitUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600">View current</a>}
        </div>
      </div>
    </div>
  );
}

/** Shows the premium pill when the logged-in member's plan is active. */
function PremiumHint() {
  const { user } = useAuth();
  const on = user?.subscription?.status === 'active' && new Date(user.subscription.expiresAt) > new Date();
  return on ? <PremiumBadge size={22} /> : null;
}
