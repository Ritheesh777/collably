import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/endpoints.js';
import { PageLoader, Spinner, StatusBadge } from '../../components/ui.jsx';
import { IconTag, IconPlus, IconCard, IconX, IconCheck, IconWarning, IconSpinner } from '../../components/icons.jsx';

/**
 * Subscription plans and coupons (v2 §8, §12).
 * Plans and coupons deactivate rather than delete — existing subscribers and
 * redemption history reference them.
 */
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // plan being edited
  const [newCoupon, setNewCoupon] = useState(null);
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  // Verifying keys by taking a real payment is a terrible feedback loop, so ask
  // Razorpay directly instead.
  const checkKeys = async () => {
    setChecking(true);
    try {
      setHealth(await adminApi.paymentHealth());
    } catch (e) {
      setHealth({ ok: false, configured: true, message: e.message });
    } finally {
      setChecking(false);
    }
  };

  const load = () =>
    Promise.all([adminApi.plans(), adminApi.coupons()])
      .then(([p, c]) => {
        setPlans(p.plans);
        setCoupons(c.coupons);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const savePlan = async (plan) => {
    try {
      await adminApi.updatePlan(plan._id, {
        name: plan.name,
        pricePaise: Number(plan.pricePaise),
        isActive: plan.isActive,
        features: plan.features,
      });
      toast.success('Plan updated');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const togglePlan = async (p) => {
    try {
      if (p.isActive) {
        await adminApi.deletePlan(p._id);
        toast.success('Plan deactivated. Existing subscribers keep it until it expires.');
      } else {
        await adminApi.updatePlan(p._id, { isActive: true });
        toast.success('Plan reactivated');
      }
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const createCoupon = async (c) => {
    try {
      await adminApi.createCoupon({
        ...c,
        value: c.type === 'fixed' ? Math.round(Number(c.value) * 100) : Number(c.value),
        usageLimit: c.usageLimit === '' ? null : Number(c.usageLimit),
        perUserLimit: c.perUserLimit === '' ? null : Number(c.perUserLimit),
      });
      toast.success(`Coupon ${c.code} created`);
      setNewCoupon(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleCoupon = async (c) => {
    try {
      if (c.isActive) await adminApi.deleteCoupon(c._id);
      else await adminApi.updateCoupon(c._id, { isActive: true });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Plans &amp; coupons</h1>
        <p className="text-ink-500">What subscribers are charged, and what discounts they can redeem.</p>
      </div>

      {/* Are payments actually working? (§8) */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-semibold text-ink-950">
              <IconCard className="h-4 w-4 text-ink-400" /> Payment gateway
            </h2>
            {health ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`badge inline-flex items-center gap-1 ${
                    health.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {health.ok ? <IconCheck className="h-3 w-3" /> : <IconWarning className="h-3 w-3" />}
                  {health.ok ? 'Working' : health.configured ? 'Not working' : 'Not configured'}
                </span>
                {health.mode && (
                  <span
                    className={`badge ${
                      health.mode === 'live' ? 'bg-amber-100 text-amber-800' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {health.mode === 'live' ? 'LIVE — real money' : 'Test mode'}
                  </span>
                )}
                <span className="text-sm text-ink-500">{health.message}</span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink-500">
                Check that Razorpay is reachable and the keys are accepted, without taking a payment.
              </p>
            )}
          </div>
          <button className="btn-outline text-xs" onClick={checkKeys} disabled={checking}>
            {checking ? <IconSpinner className="h-3.5 w-3.5 animate-spin" /> : null}
            {checking ? 'Checking…' : 'Check payment keys'}
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink-950">
          <IconCard className="h-4 w-4 text-ink-400" /> Subscription plans
        </h2>
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p._id} className="rounded-xl border border-ink-200 p-4">
              {editing?._id === p._id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Name</label>
                      <input
                        className="input"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Price (₹)</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={editing.pricePaise / 100}
                        onChange={(e) =>
                          setEditing({ ...editing, pricePaise: Math.round(Number(e.target.value) * 100) })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => savePlan(editing)}>Save</button>
                    <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">{p.name}</span>
                      <span className="badge bg-ink-100 capitalize text-ink-600">{p.audience}</span>
                      {!p.isActive && <span className="badge bg-ink-200 text-ink-600">Inactive</span>}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-500">
                      <span className="font-display text-lg font-semibold text-ink-900">
                        {rupees(p.pricePaise)}
                      </span>{' '}
                      / {p.interval.replace('ly', '')} · {p.collabLimit === null ? 'unlimited' : `${p.collabLimit} collabs`}
                      <span className="ml-2 font-mono text-xs text-ink-400">{p.code}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-outline text-xs" onClick={() => setEditing({ ...p })}>Edit</button>
                    <button className="btn-ghost text-xs" onClick={() => togglePlan(p)}>
                      {p.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">
          A plan's code cannot be changed — past payments reference it. Deactivating hides a plan
          from new checkouts; current subscribers keep it until it expires.
        </p>
      </div>

      {/* Coupons */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-ink-950">
            <IconTag className="h-4 w-4 text-ink-400" /> Coupons
          </h2>
          <button
            className="btn-outline text-xs"
            onClick={() =>
              setNewCoupon({
                code: '',
                description: '',
                type: 'percent',
                value: 10,
                audience: 'all',
                perUserLimit: 1,
                usageLimit: '',
                isActive: true,
                overridesCap: false,
              })
            }
          >
            <IconPlus className="h-3.5 w-3.5" /> New coupon
          </button>
        </div>

        {newCoupon && <CouponForm c={newCoupon} setC={setNewCoupon} onSave={createCoupon} onCancel={() => setNewCoupon(null)} />}

        <div className="mt-3 space-y-2">
          {coupons.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-ink-900">{c.code}</span>
                  <span className="badge bg-emerald-50 text-emerald-700">
                    {c.type === 'percent' ? `${c.value}% off` : `${rupees(c.value)} off`}
                  </span>
                  {c.overridesCap && (
                    <span className="badge bg-amber-100 text-amber-800">Ignores cap</span>
                  )}
                  {!c.isActive && <span className="badge bg-ink-200 text-ink-600">Inactive</span>}
                </div>
                <div className="mt-0.5 text-xs text-ink-500">
                  {c.description || 'No description'} · {c.audience} · used {c.timesUsed}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ''} times
                  {c.perUserLimit ? ` · ${c.perUserLimit} per user` : ''}
                </div>
              </div>
              <button className="btn-ghost text-xs" onClick={() => toggleCoupon(c)}>
                {c.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          ))}
          {coupons.length === 0 && !newCoupon && (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-500">No coupons yet.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-ink-400">
          Coupon discounts stack with the first-subscription and rank discounts, then the combined
          cap in Settings applies — so a large coupon cannot make a plan free.
        </p>
      </div>
    </div>
  );
}

function CouponForm({ c, setC, onSave, onCancel }) {
  return (
    <div className="rounded-xl border border-brand-300 bg-brand-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Code</label>
          <input
            className="input font-mono"
            placeholder="LAUNCH50"
            value={c.code}
            onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            placeholder="Launch promotion"
            value={c.description}
            onChange={(e) => setC({ ...c, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </div>
        <div>
          <label className="label">{c.type === 'percent' ? 'Percent off' : 'Amount off (₹)'}</label>
          <input
            className="input"
            type="number"
            min={1}
            max={c.type === 'percent' ? 100 : undefined}
            value={c.value}
            onChange={(e) => setC({ ...c, value: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Applies to</label>
          <select className="input" value={c.audience} onChange={(e) => setC({ ...c, audience: e.target.value })}>
            <option value="all">Everyone</option>
            <option value="company">Companies only</option>
            <option value="creator">Creators only</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Per user</label>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="∞"
              value={c.perUserLimit}
              onChange={(e) => setC({ ...c, perUserLimit: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Total uses</label>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="∞"
              value={c.usageLimit}
              onChange={(e) => setC({ ...c, usageLimit: e.target.value })}
            />
          </div>
        </div>
      </div>
      {/* §11 — the cap is what stops stacked discounts going free by accident.
          Overriding it is a deliberate act, so it is opt-in and spelled out. */}
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-200 bg-surface p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
          checked={!!c.overridesCap}
          onChange={(e) => setC({ ...c, overridesCap: e.target.checked })}
        />
        <span className="text-sm">
          <span className="font-medium text-ink-900">Ignore the combined discount cap</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
            Lets this coupon discount beyond the cap — up to 100%. Use for a ₹1 payment test. The
            price still floors at ₹1 because Razorpay rejects zero-amount orders. Deactivate the
            coupon before launch.
          </span>
        </span>
      </label>

      <div className="mt-3 flex gap-2">
        <button className="btn-primary" disabled={!c.code} onClick={() => onSave(c)}>Create coupon</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
