import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/endpoints.js';
import { PageLoader, Spinner } from '../../components/ui.jsx';
import Trophy from '../../components/Trophy.jsx';
import { IconSliders, IconTrophy, IconSupport, IconPlus, IconTrash } from '../../components/icons.jsx';

/**
 * Platform configuration (v2 §11, §13, §16, §33).
 *
 * §10 requires that the discount "must not be permanently hardcoded" and §13/§16
 * that rank names, thresholds and discounts be configurable. This page is the
 * only place those values are set — the pricing engine reads them live.
 */
export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    adminApi
      .settings()
      .then((d) => setS(d.settings))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch, section) => {
    setSaving(section);
    try {
      const d = await adminApi.updateSettings(patch);
      setS(d.settings);
      toast.success('Saved');
    } catch (e) {
      // The server validates rank contiguity and ranges; show its exact reason.
      toast.error(e.message);
    } finally {
      setSaving('');
    }
  };

  if (loading) return <PageLoader />;
  if (!s) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Platform settings</h1>
        <p className="text-ink-500">Pricing, ranks and support details. Changes apply immediately.</p>
      </div>

      <Pricing s={s} save={save} saving={saving} />
      <Ranks s={s} save={save} saving={saving} />
      <SupportInfo s={s} save={save} saving={saving} />
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-paper">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold text-ink-950">{title}</h2>
          <p className="text-sm text-ink-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Pricing({ s, save, saving }) {
  const [p, setP] = useState(s.pricing);
  const [free, setFree] = useState(s.freeCollabLimit);

  return (
    <Section
      icon={IconSliders}
      title="Pricing & discounts"
      subtitle="Applies to every new subscription checkout."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="First subscription discount"
          suffix="%"
          value={p.firstSubscriptionPercent}
          onChange={(v) => setP({ ...p, firstSubscriptionPercent: v })}
          hint="Given once, on a user's first paid plan."
        />
        <Field
          label="Maximum combined discount"
          suffix="%"
          value={p.maxCombinedPercent}
          onChange={(v) => setP({ ...p, maxCombinedPercent: v })}
          hint="Hard cap once all discounts stack."
        />
        <Field
          label="Free collaborations"
          value={free}
          onChange={setFree}
          hint="Before a subscription is required."
        />
      </div>

      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        The cap exists so first-subscription, rank and coupon discounts cannot combine into a free
        or negative subscription. A plan is never charged below ₹
        {(p.minChargeablePaise / 100).toFixed(2)}.
      </p>

      <button
        className="btn-primary mt-4"
        disabled={saving === 'pricing'}
        onClick={() => save({ pricing: p, freeCollabLimit: Number(free) }, 'pricing')}
      >
        {saving === 'pricing' ? <Spinner className="h-4 w-4" /> : null} Save pricing
      </button>
    </Section>
  );
}

function Ranks({ s, save, saving }) {
  const [ranks, setRanks] = useState(s.ranks.map((r) => ({ ...r })));

  const update = (i, patch) => setRanks((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i) => setRanks((rs) => rs.filter((_, j) => j !== i));
  const add = () => {
    const last = ranks[ranks.length - 1];
    // The previous top rank must gain a ceiling, or the ladder has two open ends.
    const next = [...ranks];
    if (last && (last.max === null || last.max === undefined)) next[next.length - 1] = { ...last, max: last.min + 4 };
    const start = (next[next.length - 1]?.max ?? -1) + 1;
    next.push({ key: `rank${next.length + 1}`, name: 'New rank', min: start, max: null, discountPercent: 0 });
    setRanks(next);
  };

  return (
    <Section
      icon={IconTrophy}
      title="Ranks & trophies"
      subtitle="Thresholds are monthly completed collaborations. Bands must be contiguous, and the top rank has no ceiling."
    >
      <div className="space-y-2">
        {ranks.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-ink-200 p-3">
            <Trophy rankKey={r.key} size="sm" />
            <div className="min-w-[110px] flex-1">
              <label className="label text-xs">Name</label>
              <input className="input" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <div className="w-20">
              <label className="label text-xs">From</label>
              <input
                className="input"
                type="number"
                min={0}
                value={r.min}
                onChange={(e) => update(i, { min: Number(e.target.value) })}
              />
            </div>
            <div className="w-20">
              <label className="label text-xs">To</label>
              <input
                className="input"
                type="number"
                placeholder="∞"
                value={r.max ?? ''}
                onChange={(e) => update(i, { max: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div className="w-24">
              <label className="label text-xs">Discount %</label>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={r.discountPercent}
                onChange={(e) => update(i, { discountPercent: Number(e.target.value) })}
              />
            </div>
            {ranks.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="rounded-lg p-2.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${r.name}`}
              >
                <IconTrash className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn-outline" onClick={add}>
          <IconPlus className="h-4 w-4" /> Add rank
        </button>
        <button className="btn-primary" disabled={saving === 'ranks'} onClick={() => save({ ranks }, 'ranks')}>
          {saving === 'ranks' ? <Spinner className="h-4 w-4" /> : null} Save ranks
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-400">
        Leave the highest rank's "To" empty for no ceiling. Past achievements keep the name they were
        earned under.
      </p>
    </Section>
  );
}

function SupportInfo({ s, save, saving }) {
  const [sup, setSup] = useState({ ...s.support, faqs: s.support.faqs?.map((f) => ({ ...f })) || [] });

  const setFaq = (i, patch) =>
    setSup((x) => ({ ...x, faqs: x.faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));

  return (
    <Section icon={IconSupport} title="Help & support" subtitle="Shown on the public Help & Support page.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Support email</label>
          <input className="input" value={sup.email} onChange={(e) => setSup({ ...sup, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Helpline (optional)</label>
          <input
            className="input"
            placeholder="+91 …"
            value={sup.helpline}
            onChange={(e) => setSup({ ...sup, helpline: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Support hours</label>
          <input className="input" value={sup.hours} onChange={(e) => setSup({ ...sup, hours: e.target.value })} />
        </div>
        <div>
          <label className="label">Typical response time</label>
          <input
            className="input"
            value={sup.responseTime}
            onChange={(e) => setSup({ ...sup, responseTime: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Frequently asked questions</label>
          <button
            className="btn-ghost text-xs"
            onClick={() => setSup((x) => ({ ...x, faqs: [...x.faqs, { q: '', a: '', category: 'general' }] }))}
          >
            <IconPlus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {sup.faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-3">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Question"
                  value={f.q}
                  onChange={(e) => setFaq(i, { q: e.target.value })}
                />
                <button
                  onClick={() => setSup((x) => ({ ...x, faqs: x.faqs.filter((_, j) => j !== i) }))}
                  className="rounded-lg p-2.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove question"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
              <textarea
                className="input mt-2 min-h-[70px]"
                placeholder="Answer"
                value={f.a}
                onChange={(e) => setFaq(i, { a: e.target.value })}
              />
            </div>
          ))}
          {sup.faqs.length === 0 && (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
              No FAQs yet. Adding a few cuts down on repeat support tickets.
            </p>
          )}
        </div>
      </div>

      <button className="btn-primary mt-4" disabled={saving === 'support'} onClick={() => save({ support: sup }, 'support')}>
        {saving === 'support' ? <Spinner className="h-4 w-4" /> : null} Save support info
      </button>
    </Section>
  );
}

function Field({ label, value, onChange, suffix, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          className={`input ${suffix ? 'pr-8' : ''}`}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
