import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { subscriptionApi } from '../../api/endpoints.js';
import { PageLoader, Spinner, StatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/format.js';
import { IconCheck, IconSparkles, IconTrophy, IconHandshake } from '../../components/icons.jsx';

const RZP_SDK = 'https://checkout.razorpay.com/v1/checkout.js';

/** Loads Razorpay's checkout script once, on demand. */
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = RZP_SDK;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Subscribe() {
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [quota, setQuota] = useState(null);
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, me] = await Promise.all([subscriptionApi.plans(), subscriptionApi.me()]);
        setPlans(p.plans);
        setSelected(p.plans[0]?.code || null);
        setCurrent(me.subscription);
        setQuota(me.quota);
        setPayments(me.payments || []);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshQuote = useCallback(
    async (planCode, couponCode) => {
      if (!planCode) return;
      setQuoting(true);
      try {
        const { quote } = await subscriptionApi.quote(planCode, couponCode || '');
        setQuote(quote);
        if (couponCode && quote.couponError) toast.error(quote.couponError);
        else if (couponCode && quote.coupon) toast.success(`Coupon ${quote.coupon.code} applied`);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setQuoting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selected) refreshQuote(selected, applied);
  }, [selected, applied, refreshQuote]);

  const pay = async () => {
    setPaying(true);
    try {
      const res = await subscriptionApi.checkout(selected, applied || '');

      // Free-pass coupon: the server already activated the plan — there is no
      // payment window to open. Skip Razorpay entirely.
      if (res.free) {
        setCurrent(res.subscription);
        setQuota(res.quota);
        toast.success('Subscription activated — free!');
        refresh();
        const me = await subscriptionApi.me();
        setPayments(me.payments || []);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the payment window. Check your connection.');

      const { order, keyId, quote: q } = res;

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Collably',
        description: q.plan.name,
        // Razorpay demands a contact number before it will show any payment
        // method. We already collect one at registration, so passing it here
        // removes a whole "Contact details" step from every checkout.
        prefill: { name: user?.name, email: user?.email, contact: user?.phone || '' },
        theme: { color: '#d9542f' },
        handler: async (resp) => {
          // The browser saying "paid" proves nothing — the server verifies the
          // signature before anything is activated (BR-NEW-005).
          try {
            const res = await subscriptionApi.verify(resp);
            setCurrent(res.subscription);
            setQuota(res.quota);
            toast.success('Subscription activated!');
            refresh();
            const me = await subscriptionApi.me();
            setPayments(me.payments || []);
          } catch (e) {
            toast.error(e.message || 'We could not verify that payment.');
          }
        },
        modal: { ondismiss: () => toast('Payment cancelled') },
      });
      rzp.on('payment.failed', (r) => toast.error(r.error?.description || 'Payment failed'));
      rzp.open();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <PageLoader />;

  const isActive = current?.status === 'active' && new Date(current.expiresAt) > new Date();
  const b = quote?.breakdown;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Subscription</h1>
        <p className="text-ink-500">
          Your first 3 collaborations are free. Subscribe to keep collaborating.
        </p>
      </div>

      {/* Current status (§35) */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink-950 capitalize">
                {isActive ? current.plan : 'Free plan'}
              </h2>
              <StatusBadge status={isActive ? 'active' : 'pending'} />
            </div>
            <p className="mt-0.5 text-sm text-ink-500">
              {isActive
                ? `Renews / expires on ${formatDate(current.expiresAt)}`
                : quota
                  ? `${quota.remaining} of ${quota.limit} free collaborations remaining`
                  : ''}
            </p>
          </div>
          {!isActive && quota?.requiresSubscription && (
            <span className="badge bg-brand-50 text-brand-700">Subscription required</span>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <button
            key={p.code}
            onClick={() => setSelected(p.code)}
            className={`card p-5 text-left transition ${
              selected === p.code ? 'border-brand-500 ring-2 ring-brand-500/20' : 'card-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink-950">{p.name}</h3>
              {selected === p.code && <IconCheck className="h-4 w-4 text-brand-600" />}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-ink-950">
              {rupees(p.pricePaise / 100)}
              <span className="text-sm font-normal text-ink-500">/{p.interval.replace('ly', '')}</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                  <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Coupon + price breakdown (§12) */}
      <div className="card p-5">
        <h3 className="font-semibold text-ink-950">Have a coupon?</h3>
        <div className="mt-2 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Enter coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
          <button className="btn-outline" onClick={() => setApplied(coupon.trim())} disabled={quoting}>
            Apply
          </button>
          {applied && (
            <button
              className="btn-ghost"
              onClick={() => {
                setApplied('');
                setCoupon('');
              }}
            >
              Remove
            </button>
          )}
        </div>

        <div className="mt-5 space-y-2 border-t border-ink-200 pt-4 text-sm">
          {quoting ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : quote ? (
            <>
              <Row label="Plan price" value={rupees(quote.base)} />
              {b.firstSubscriptionPercent > 0 && (
                <Row
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <IconSparkles className="h-3.5 w-3.5 text-brand-500" /> First subscription discount
                    </span>
                  }
                  value={`−${b.firstSubscriptionPercent}%`}
                  good
                />
              )}
              {b.rankPercent > 0 && (
                <Row
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <IconTrophy className="h-3.5 w-3.5 text-brand-500" /> {b.rankName} rank discount
                    </span>
                  }
                  value={`−${b.rankPercent}%`}
                  good
                />
              )}
              {b.couponPercent > 0 && (
                <Row label={`Coupon ${quote.coupon?.code || ''}`} value={`−${b.couponPercent}%`} good />
              )}
              {b.couponFixedPaise > 0 && (
                <Row
                  label={`Coupon ${quote.coupon?.code || ''}`}
                  value={`−${rupees(b.couponFixedPaise / 100)}`}
                  good
                />
              )}
              {b.cappedAtPercent > 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Combined discounts are capped at {b.maxCombinedPercent}%.
                </p>
              )}
              {b.atMinimumCharge && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Your discount covers the full price, so this is the smallest amount we can charge
                  (₹{((b.minChargeablePaise ?? 100) / 100).toFixed(2)}) — payments cannot be
                  processed for ₹0.
                </p>
              )}
              <Row label="Total discount" value={`−${rupees(quote.discount)}`} good />
              <div className="flex items-center justify-between border-t border-ink-200 pt-3">
                <span className="font-semibold text-ink-900">You pay</span>
                <span className="font-display text-2xl font-bold text-ink-950">{rupees(quote.amount)}</span>
              </div>
            </>
          ) : null}
        </div>

        <button className="btn-primary mt-5 w-full py-3 text-base" onClick={pay} disabled={paying || quoting || !quote}>
          {paying ? <Spinner className="h-4 w-4" /> : <IconHandshake className="h-4 w-4" />}
          {paying
            ? b?.free
              ? 'Activating…'
              : 'Opening payment…'
            : quote
              ? b?.free
                ? 'Activate free subscription'
                : `Pay ${rupees(quote.amount)} securely`
              : 'Select a plan'}
        </button>
        <p className="mt-2 text-center text-xs text-ink-400">
          Secured by Razorpay. This pays for your Collably plan only — payments to creators stay
          between you and them.
        </p>
      </div>

      {/* History */}
      {payments.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-ink-950">Payment history</h3>
          <ul className="divide-y divide-ink-100">
            {payments.map((p) => (
              <li key={p._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium text-ink-800">{p.planCode}</div>
                  <div className="text-xs text-ink-400">{formatDate(p.createdAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink-800">{rupees(p.amountPaise / 100)}</span>
                  <StatusBadge status={p.status === 'paid' ? 'accepted' : p.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, good }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-600">{label}</span>
      <span className={good ? 'font-medium text-emerald-700' : 'text-ink-800'}>{value}</span>
    </div>
  );
}
