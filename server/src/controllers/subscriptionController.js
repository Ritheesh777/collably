import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { Coupon, CouponUsage } from '../models/Coupon.js';
import { User } from '../models/User.js';
import { quotePrice, quoteOrThrow } from '../utils/pricing.js';
import { quotaFor } from '../utils/quota.js';
import { razorpay, isRazorpayConfigured, verifyPaymentSignature, verifyWebhookSignature } from '../config/razorpay.js';
import { env } from '../config/env.js';
import { notify } from '../utils/notify.js';

/** Adds one interval to a date. */
function addPeriod(from, interval) {
  const d = new Date(from);
  if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// GET /api/subscriptions/plans — plans for the caller's role
export const listPlans = asyncHandler(async (req, res) => {
  const audience = req.user.role === 'company' ? 'company' : 'creator';
  const plans = await SubscriptionPlan.find({ audience, isActive: true }).sort('sortOrder').lean();
  res.json({ success: true, plans });
});

// POST /api/subscriptions/quote { planCode, couponCode } — live price preview (§12)
export const getQuote = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findOne({ code: req.body.planCode, isActive: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  if (plan.audience !== req.user.role) throw ApiError.forbidden('That plan is not for your account type');

  const quote = await quotePrice({ user: req.user, plan, couponCode: req.body.couponCode });
  res.json({ success: true, quote });
});

// POST /api/subscriptions/checkout { planCode, couponCode } — creates a Razorpay order
export const createCheckout = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured())
    throw ApiError.badRequest('Payments are not configured yet. Please try again later.');

  const plan = await SubscriptionPlan.findOne({ code: req.body.planCode, isActive: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  if (plan.audience !== req.user.role) throw ApiError.forbidden('That plan is not for your account type');

  // Price is computed on the SERVER. Never trust an amount sent by the client.
  const quote = await quoteOrThrow({ user: req.user, plan, couponCode: req.body.couponCode });

  let order;
  try {
    order = await razorpay().orders.create({
      amount: quote.amountPaise,
      currency: quote.currency,
      receipt: `sub_${req.user._id}_${Date.now()}`.slice(0, 40),
      notes: { userId: String(req.user._id), planCode: plan.code },
    });
  } catch (err) {
    // Razorpay's SDK throws its own error shape, which fell through to the
    // generic handler and reached the user as "Internal server error" — a dead
    // end for them and for whoever has to diagnose it. Log the real cause for
    // the operator, and tell the user something true and actionable.
    const detail = err?.error?.description || err?.message || 'unknown error';
    const isAuth = err?.statusCode === 401 || /authentication/i.test(detail);
    console.error(
      `[razorpay] order creation failed (${isAuth ? 'BAD API KEYS' : 'api error'}): ${detail}`
    );
    if (isAuth)
      // Never expose "our keys are wrong" to a customer — that is our problem.
      throw ApiError.badRequest(
        'Payments are temporarily unavailable. Our team has been notified — please try again shortly.'
      );
    throw ApiError.badRequest(`We could not start this payment: ${detail}`);
  }

  const payment = await SubscriptionPayment.create({
    user: req.user._id,
    plan: plan._id,
    planCode: plan.code,
    audience: plan.audience,
    basePaise: quote.basePaise,
    discountPaise: quote.discountPaise,
    amountPaise: quote.amountPaise,
    currency: quote.currency,
    breakdown: quote.breakdown,
    coupon: quote.coupon?._id,
    couponCode: quote.coupon?.code || '',
    razorpayOrderId: order.id,
    status: 'created',
  });

  res.status(201).json({
    success: true,
    order: { id: order.id, amount: order.amount, currency: order.currency },
    keyId: env.razorpay.keyId, // publishable — safe to send to the browser
    paymentId: payment._id,
    quote,
  });
});

/** Marks a payment paid and activates the plan. Shared by verify + webhook. */
async function activateFromPayment(payment, { razorpayPaymentId, signature } = {}) {
  if (payment.status === 'paid') return payment; // already handled (idempotent)

  const plan = await SubscriptionPlan.findById(payment.plan);
  const now = new Date();
  const end = addPeriod(now, plan?.interval || 'monthly');

  payment.status = 'paid';
  payment.razorpayPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
  payment.razorpaySignature = signature || payment.razorpaySignature;
  payment.paidAt = now;
  payment.periodStart = now;
  payment.periodEnd = end;
  await payment.save();

  await User.findByIdAndUpdate(payment.user, {
    subscription: {
      status: 'active',
      plan: plan?.code || payment.planCode,
      collabLimit: plan?.collabLimit ?? null,
      startedAt: now,
      expiresAt: end,
      razorpaySubscriptionId: '',
    },
  });

  // Record coupon redemption only once the money actually landed
  if (payment.coupon) {
    await CouponUsage.create({
      coupon: payment.coupon,
      user: payment.user,
      payment: payment._id,
      discountPaise: payment.discountPaise,
    });
    await Coupon.updateOne({ _id: payment.coupon }, { $inc: { usedCount: 1 } });
  }

  await notify({
    user: payment.user,
    type: 'account_status',
    title: 'Subscription activated',
    body: `Your ${plan?.name || payment.planCode} plan is active until ${end.toDateString()}.`,
    link: '/settings',
  });

  return payment;
}

// POST /api/subscriptions/verify — the browser reports back after checkout
// BR-NEW-005: we ONLY activate after verifying Razorpay's signature server-side.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const payment = await SubscriptionPayment.findOne({
    razorpayOrderId: razorpay_order_id,
    user: req.user._id,
  });
  if (!payment) throw ApiError.notFound('Payment record not found');

  const ok = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!ok) {
    payment.status = 'failed';
    payment.failureReason = 'Signature verification failed';
    await payment.save();
    throw ApiError.badRequest('Payment could not be verified.');
  }

  await activateFromPayment(payment, {
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    subscription: user.subscription,
    quota: await quotaFor(user, user.role === 'company' ? 'company' : 'creator'),
  });
});

// POST /api/subscriptions/webhook — Razorpay → us (source of truth if the
// browser closes mid-payment). Mounted with a raw body parser.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

  if (!verifyWebhookSignature({ rawBody: raw, signature })) {
    throw ApiError.badRequest('Invalid webhook signature');
  }

  const event = JSON.parse(raw);
  const entity = event?.payload?.payment?.entity;

  if (event.event === 'payment.captured' && entity?.order_id) {
    const payment = await SubscriptionPayment.findOne({ razorpayOrderId: entity.order_id });
    if (payment) await activateFromPayment(payment, { razorpayPaymentId: entity.id });
  }
  if (event.event === 'payment.failed' && entity?.order_id) {
    await SubscriptionPayment.updateOne(
      { razorpayOrderId: entity.order_id, status: { $ne: 'paid' } },
      { status: 'failed', failureReason: entity?.error_description || 'Payment failed' }
    );
  }

  res.json({ success: true }); // always 200 so Razorpay stops retrying
});

// GET /api/subscriptions/me — current plan + history (§35)
export const mySubscription = asyncHandler(async (req, res) => {
  const role = req.user.role === 'company' ? 'company' : 'creator';
  const payments = await SubscriptionPayment.find({ user: req.user._id })
    .sort('-createdAt')
    .limit(20)
    .lean();
  res.json({
    success: true,
    subscription: req.user.subscription,
    quota: await quotaFor(req.user, role),
    payments,
  });
});
