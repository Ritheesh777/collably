import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { PlatformSettings } from '../models/PlatformSettings.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Coupon, CouponUsage } from '../models/Coupon.js';
import { SupportTicket } from '../models/SupportTicket.js';

/**
 * Administrator configuration (v2 §11, §12, §16, §33).
 *
 * §10 is explicit that the discount "must not be permanently hardcoded", and
 * §13/§16 that rank names, thresholds and their discounts are configurable.
 * Everything here writes to the PlatformSettings singleton.
 */

// GET /api/admin/settings
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await PlatformSettings.get();
  res.json({ success: true, settings });
});

// PATCH /api/admin/settings  { pricing, ranks, freeCollabLimit, support }
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.get();
  const { pricing, ranks, freeCollabLimit, support } = req.body;

  if (pricing) {
    const { firstSubscriptionPercent, maxCombinedPercent, minChargeablePaise } = pricing;
    for (const [k, v] of Object.entries({ firstSubscriptionPercent, maxCombinedPercent })) {
      if (v !== undefined && (typeof v !== 'number' || v < 0 || v > 100))
        throw ApiError.badRequest(`${k} must be between 0 and 100.`);
    }
    if (minChargeablePaise !== undefined && (typeof minChargeablePaise !== 'number' || minChargeablePaise < 1))
      throw ApiError.badRequest('minChargeablePaise must be at least 1.');
    Object.assign(settings.pricing, pricing);
  }

  if (ranks) {
    if (!Array.isArray(ranks) || ranks.length === 0)
      throw ApiError.badRequest('At least one rank must be defined.');
    // Contiguity matters: a gap (e.g. Bronze 4–7, Silver 9–15) would leave a
    // user with 8 collaborations rankless, so reject it rather than guess.
    const sorted = [...ranks].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (typeof r.min !== 'number' || r.min < 0)
        throw ApiError.badRequest(`Rank "${r.name}" needs a min of 0 or more.`);
      if (r.discountPercent < 0 || r.discountPercent > 100)
        throw ApiError.badRequest(`Rank "${r.name}" discount must be 0–100.`);
      const next = sorted[i + 1];
      if (next) {
        if (r.max === null || r.max === undefined)
          throw ApiError.badRequest(`Only the highest rank may have an open-ended max.`);
        if (r.max < r.min) throw ApiError.badRequest(`Rank "${r.name}" has max below min.`);
        if (next.min !== r.max + 1)
          throw ApiError.badRequest(
            `Ranks must be contiguous: "${r.name}" ends at ${r.max} but "${next.name}" starts at ${next.min}.`
          );
      }
    }
    if (sorted[0].min !== 0) throw ApiError.badRequest('The lowest rank must start at 0.');
    if (sorted[sorted.length - 1].max !== null && sorted[sorted.length - 1].max !== undefined)
      throw ApiError.badRequest('The highest rank must be open-ended (no max).');
    settings.ranks = sorted;
  }

  if (freeCollabLimit !== undefined) {
    if (typeof freeCollabLimit !== 'number' || freeCollabLimit < 0)
      throw ApiError.badRequest('freeCollabLimit must be 0 or more.');
    settings.freeCollabLimit = freeCollabLimit;
  }

  if (support) Object.assign(settings.support, support);

  await settings.save();
  res.json({ success: true, settings });
});

// ---------------------------------------------------------------- plans (§8)

// GET /api/admin/plans — all plans, including inactive
export const listPlans = asyncHandler(async (_req, res) => {
  const plans = await SubscriptionPlan.find().sort('audience sortOrder').lean();
  res.json({ success: true, plans });
});

// POST /api/admin/plans
export const createPlan = asyncHandler(async (req, res) => {
  const exists = await SubscriptionPlan.findOne({ code: req.body.code });
  if (exists) throw ApiError.badRequest(`A plan with code "${req.body.code}" already exists.`);
  const plan = await SubscriptionPlan.create(req.body);
  res.status(201).json({ success: true, plan });
});

// PATCH /api/admin/plans/:id
export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  // The code is the join key used by past payments — repointing it would
  // silently rewrite history in the payment audit trail.
  delete req.body.code;
  if (req.body.pricePaise !== undefined && req.body.pricePaise < 100)
    throw ApiError.badRequest('Price must be at least ₹1.');
  Object.assign(plan, req.body);
  await plan.save();
  res.json({ success: true, plan });
});

// DELETE /api/admin/plans/:id — deactivate, never destroy
export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  // Subscribers reference this plan; a hard delete would orphan their records.
  plan.isActive = false;
  await plan.save();
  res.json({ success: true, plan, note: 'Plan deactivated. Existing subscribers keep their plan until it expires.' });
});

// -------------------------------------------------------------- coupons (§12)

// GET /api/admin/coupons
export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort('-createdAt').lean();
  const usage = await CouponUsage.aggregate([{ $group: { _id: '$coupon', n: { $sum: 1 } } }]);
  const usageMap = Object.fromEntries(usage.map((u) => [String(u._id), u.n]));
  res.json({
    success: true,
    coupons: coupons.map((c) => ({ ...c, timesUsed: usageMap[String(c._id)] || 0 })),
  });
});

// POST /api/admin/coupons
export const createCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  if (!code) throw ApiError.badRequest('Coupon code is required.');
  const exists = await Coupon.findOne({ code });
  if (exists) throw ApiError.badRequest(`Coupon "${code}" already exists.`);

  const { type, value } = req.body;
  if (type === 'percent' && (value < 1 || value > 100))
    throw ApiError.badRequest('A percentage coupon must be between 1 and 100.');
  if (type === 'fixed' && value < 1)
    throw ApiError.badRequest('A fixed coupon must be at least 1 paisa.');

  const coupon = await Coupon.create({ ...req.body, code });
  res.status(201).json({ success: true, coupon });
});

// PATCH /api/admin/coupons/:id
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  // CouponUsage rows point at this code; renaming it would break redemption history.
  delete req.body.code;
  Object.assign(coupon, req.body);
  await coupon.save();
  res.json({ success: true, coupon });
});

// DELETE /api/admin/coupons/:id — deactivate
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  coupon.isActive = false;
  await coupon.save();
  res.json({ success: true, coupon });
});

// -------------------------------------------------------- support inbox (§33)

// GET /api/admin/tickets?status=
export const listTickets = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  const items = await SupportTicket.find(q)
    .populate('user', 'name role email')
    .sort('-createdAt')
    .lean();
  const counts = await SupportTicket.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  res.json({
    success: true,
    items,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  });
});

// PATCH /api/admin/tickets/:id  { status, adminResponse }
export const respondTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw ApiError.notFound('Ticket not found');
  if (req.body.status) ticket.status = req.body.status;
  if (req.body.adminResponse !== undefined) {
    ticket.adminResponse = req.body.adminResponse;
    ticket.respondedBy = req.user._id;
    ticket.respondedAt = new Date();
  }
  await ticket.save();
  res.json({ success: true, ticket });
});

// ------------------------------------------------------- payment health (§8)

/**
 * GET /api/admin/payments/health
 *
 * Answers "are the Razorpay keys actually working?" without taking a payment.
 * It creates a ₹1 order and never pays it — unpaid orders simply expire, so
 * this is safe to run against live keys.
 */
export const paymentHealth = asyncHandler(async (_req, res) => {
  const { isRazorpayConfigured, razorpay } = await import('../config/razorpay.js');
  const { env } = await import('../config/env.js');

  if (!isRazorpayConfigured())
    return res.json({
      success: true,
      configured: false,
      ok: false,
      mode: null,
      message: 'No Razorpay keys are set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.',
    });

  const keyId = env.razorpay.keyId || '';
  const mode = keyId.startsWith('rzp_live_') ? 'live' : keyId.startsWith('rzp_test_') ? 'test' : 'unknown';

  try {
    const order = await razorpay().orders.create({
      amount: 100,
      currency: 'INR',
      receipt: `healthcheck_${Date.now()}`.slice(0, 40),
      notes: { purpose: 'InfluConnect key health check — not a real purchase' },
    });
    res.json({
      success: true,
      configured: true,
      ok: true,
      mode,
      keyId: `${keyId.slice(0, 12)}…`, // enough to identify, never the secret
      message:
        mode === 'live'
          ? 'Live keys are working. Real payments will be charged.'
          : 'Test keys are working. Use Razorpay test cards — no real money moves.',
      probeOrderId: order.id,
    });
  } catch (err) {
    const detail = err?.error?.description || err?.message || 'unknown error';
    res.json({
      success: true,
      configured: true,
      ok: false,
      mode,
      keyId: `${keyId.slice(0, 12)}…`,
      message:
        err?.statusCode === 401 || /authentication/i.test(detail)
          ? 'Razorpay rejected these keys. They may have been regenerated, or the key and secret may be from different accounts.'
          : `Razorpay error: ${detail}`,
    });
  }
});
