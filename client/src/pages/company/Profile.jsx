import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAsync } from '../../hooks/useAsync.js';
import { companyApi } from '../../api/endpoints.js';
import { PageLoader, Field, Avatar } from '../../components/ui.jsx';
import { INDUSTRIES } from '../../utils/constants.js';
import PremiumBadge from '../../components/PremiumBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CompanyProfile() {
  const { data, loading, reload } = useAsync(() => companyApi.me(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const profile = form || data?.profile;
  if (loading || !profile) return <PageLoader />;

  const set = (k) => (e) => setForm({ ...profile, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      await companyApi.update(profile);
      toast.success('Profile saved');
      reload();
      setForm(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadMedia = async (field, file) => {
    const fd = new FormData();
    fd.append(field, file);
    try {
      await companyApi.updateMedia(fd);
      toast.success(`${field} updated`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>

      <div className="card overflow-hidden">
        <div className="relative h-36 bg-gradient-to-br from-brand-500 to-accent-500">
          {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />}
          <label className="absolute right-3 top-3 cursor-pointer rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-slate-700">
            Change banner
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadMedia('banner', e.target.files[0])} />
          </label>
        </div>
        <div className="flex items-end gap-4 px-6 pb-4">
          <div className="-mt-10">
            <Avatar src={profile.logoUrl} name={profile.companyName} size={80} className="ring-4 ring-white" />
            <PremiumHint />
          </div>
          <label className="mb-2 cursor-pointer text-xs font-medium text-brand-600">
            Change logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadMedia('logo', e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <Field label="Company Name"><input className="input" value={profile.companyName || ''} onChange={set('companyName')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Industry">
            <select className="input" value={profile.industry || 'Other'} onChange={set('industry')}>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Website"><input className="input" value={profile.website || ''} onChange={set('website')} placeholder="https://" /></Field>
        </div>
        <Field label="Description"><textarea className="input min-h-[110px]" value={profile.description || ''} onChange={set('description')} /></Field>
        <Field label="Address"><input className="input" value={profile.address || ''} onChange={set('address')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City"><input className="input" value={profile.city || ''} onChange={set('city')} /></Field>
          <Field label="State"><input className="input" value={profile.state || ''} onChange={set('state')} /></Field>
          <Field label="Country"><input className="input" value={profile.country || ''} onChange={set('country')} /></Field>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
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
