import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { campaignApi } from '../../api/endpoints.js';
import { Field, PageLoader } from '../../components/ui.jsx';
import { IconSpinner } from '../../components/icons.jsx';
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_TYPES,
  FOLLOWER_RANGES,
  PLATFORMS,
  PLATFORM_LABELS,
} from '../../utils/constants.js';

const empty = {
  title: '',
  description: '',
  category: 'Restaurant',
  campaignType: 'Product Review',
  platforms: ['instagram'],
  followerRange: '1K-5K',
  minEngagementRate: '',
  city: '',
  state: '',
  country: '',
  isWorldwide: false,
  creatorsNeeded: 1,
  deadline: '',
  terms: '',
};

export default function CampaignForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  // setBusy is async, so a fast double-click can fire twice before the button
  // re-renders as disabled. A ref blocks the second call synchronously.
  const submitting = useRef(false);
  // One key per form session → the backend collapses any retry into one campaign.
  const idemKey = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())
  );

  useEffect(() => {
    if (!isEdit) return;
    campaignApi
      .get(id)
      .then(({ campaign }) => {
        setForm({
          ...empty,
          ...campaign,
          deadline: campaign.deadline ? campaign.deadline.slice(0, 10) : '',
          minEngagementRate: campaign.minEngagementRate || '',
        });
      })
      .catch(() => toast.error('Failed to load campaign'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const togglePlatform = (p) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));

  const buildPayload = (status) => ({
    title: form.title,
    description: form.description,
    category: form.category,
    campaignType: form.campaignType,
    platforms: form.platforms,
    followerRange: form.followerRange,
    minEngagementRate: form.minEngagementRate ? Number(form.minEngagementRate) : 0,
    city: form.city,
    state: form.state,
    country: form.country,
    isWorldwide: form.isWorldwide,
    creatorsNeeded: Number(form.creatorsNeeded) || 1,
    deadline: form.deadline || undefined,
    terms: form.terms,
    ...(status ? { status } : {}),
  });

  const submit = async (status) => {
    if (submitting.current) return; // synchronous double-click guard
    if (!form.title || form.description.length < 10)
      return toast.error('Add a title and a description (min 10 chars).');
    submitting.current = true;
    setBusy(true);
    try {
      let campaign;
      if (isEdit) {
        ({ campaign } = await campaignApi.update(id, buildPayload(status)));
      } else {
        ({ campaign } = await campaignApi.create(buildPayload(status), idemKey.current));
      }
      if (banner) {
        const fd = new FormData();
        fd.append('banner', banner);
        await campaignApi.uploadMedia(campaign._id, fd);
      }
      toast.success(isEdit ? 'Campaign updated' : status === 'draft' ? 'Saved as draft' : 'Campaign published!');
      navigate(`/company/campaigns/${campaign._id}`);
    } catch (err) {
      toast.error(err.message);
      submitting.current = false; // allow a genuine retry after a failure
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/company/campaigns" className="text-slate-400 hover:text-slate-600">←</Link>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Campaign' : 'Create Campaign'}</h1>
      </div>

      <div className="card space-y-5 p-6">
        <Field label="Campaign Title" required>
          <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Instagram Reel for our new menu" />
        </Field>
        <Field label="Description" required hint="What should the creator do? Deliverables, do's & don'ts.">
          <textarea className="input min-h-[130px]" value={form.description} onChange={set('description')} />
        </Field>

        <Field label="Campaign Banner (optional)">
          <input type="file" accept="image/*" onChange={(e) => setBanner(e.target.files[0])} className="text-sm" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select className="input" value={form.category} onChange={set('category')}>
              {CAMPAIGN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Campaign Type">
            <select className="input" value={form.campaignType} onChange={set('campaignType')}>
              {CAMPAIGN_TYPES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Platforms Required">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => togglePlatform(p)}
                className={`chip ${form.platforms.includes(p) ? 'bg-brand-100 text-brand-700' : ''}`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Followers Required">
            <select className="input" value={form.followerRange} onChange={set('followerRange')}>
              {FOLLOWER_RANGES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Min Engagement Rate (%)">
            <input type="number" step="0.1" className="input" value={form.minEngagementRate} onChange={set('minEngagementRate')} placeholder="Optional" />
          </Field>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.isWorldwide} onChange={set('isWorldwide')} /> This campaign is open worldwide
          </label>
          {!form.isWorldwide && (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Field label="City"><input className="input" value={form.city} onChange={set('city')} /></Field>
              <Field label="State"><input className="input" value={form.state} onChange={set('state')} /></Field>
              <Field label="Country"><input className="input" value={form.country} onChange={set('country')} /></Field>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number of Creators Needed">
            <input type="number" min="1" className="input" value={form.creatorsNeeded} onChange={set('creatorsNeeded')} />
          </Field>
          <Field label="Campaign Deadline">
            <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
          </Field>
        </div>

        <Field label="Terms & Conditions">
          <textarea className="input min-h-[90px]" value={form.terms} onChange={set('terms')} placeholder="Any specific requirements or terms…" />
        </Field>

        <div className="flex flex-col gap-2 border-t border-ink-200 pt-5 sm:flex-row sm:justify-end">
          {!isEdit && (
            <button className="btn-outline" onClick={() => submit('draft')} disabled={busy}>
              {busy ? 'Saving…' : 'Save as Draft'}
            </button>
          )}
          <button className="btn-primary" onClick={() => submit(isEdit ? undefined : 'active')} disabled={busy}>
            {busy && <IconSpinner className="h-4 w-4 animate-spin" />}
            {busy
              ? isEdit
                ? 'Saving Changes…'
                : 'Creating Campaign…'
              : isEdit
                ? 'Save Changes'
                : 'Publish Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
