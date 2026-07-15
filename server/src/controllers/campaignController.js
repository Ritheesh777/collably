import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { uploadBuffer } from '../config/cloudinary.js';
import { Campaign } from '../models/Campaign.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Application } from '../models/Application.js';
import { SavedCampaign } from '../models/SavedCampaign.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { rangesForFollowerCount } from '../models/Campaign.js';
import { runOnce } from '../utils/idempotency.js';
import crypto from 'crypto';

/**
 * Fallback idempotency key for clients that send none: a fingerprint of who +
 * what + a 20-second window. Repeat submissions of the same campaign inside
 * that window collapse into one; posting the same title again later is fine.
 */
function autoKey(userId, body) {
  const bucket = Math.floor(Date.now() / 20000);
  const raw = `${userId}|${body?.title || ''}|${body?.description || ''}|${bucket}`;
  return 'auto_' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

// POST /api/campaigns  (company)
// BR-NEW-001: one submission must create EXACTLY one campaign.
export const createCampaign = asyncHandler(async (req, res) => {
  const companyProfile = await CompanyProfile.findOne({ user: req.user._id });

  const create = async () => {
    const campaign = await Campaign.create({
      ...req.body,
      company: req.user._id,
      companyProfile: companyProfile?._id,
    });
    if (companyProfile) {
      companyProfile.campaignsPosted += 1;
      await companyProfile.save();
    }
    return campaign;
  };

  // If the client didn't send a key (older build, proxy retry), derive a
  // deterministic one from the payload + a 20s window. Concurrent duplicates
  // then collide on the unique index instead of racing a "is there a recent
  // one?" lookup — which every parallel request passes at the same instant.
  const key = req.headers['idempotency-key'] || autoKey(req.user._id, req.body);

  const { result: campaign, idempotent } = await runOnce({
    key,
    user: req.user._id,
    resource: 'campaign',
    work: create,
    load: (id) => Campaign.findById(id),
  });

  res.status(201).json({ success: true, campaign, idempotent });
});

// GET /api/campaigns/mine  (company)
export const getMyCampaigns = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 12 } = req.query;
  const filter = { company: req.user._id };
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Campaign.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
    Campaign.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/campaigns  (browse/search — creators & public)
export const browseCampaigns = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    platform,
    followerRange,
    campaignType,
    city,
    country,
    sort = 'latest',
    page = 1,
    limit = 12,
  } = req.query;

  const filter = { status: 'active', moderation: { $ne: 'removed' } };
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (campaignType) filter.campaignType = campaignType;
  if (followerRange) filter.followerRange = followerRange;
  if (platform) filter.platforms = platform;

  // §8 — a creator only sees campaigns their follower count qualifies for.
  // (`all=1` lets them deliberately browse everything.)
  if (req.user?.role === 'creator' && req.query.all !== '1' && !followerRange) {
    const me = await CreatorProfile.findOne({ user: req.user._id }).select('totalFollowers').lean();
    filter.followerRange = { $in: rangesForFollowerCount(me?.totalFollowers || 0) };
  }
  if (city) filter.city = new RegExp(`^${city}$`, 'i');
  if (country) filter.$or = [{ country: new RegExp(`^${country}$`, 'i') }, { isWorldwide: true }];

  const sortMap = {
    latest: '-createdAt',
    popular: '-applicationsCount -viewsCount',
    deadline: 'deadline',
  };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Campaign.find(filter)
      .sort(sortMap[sort] || '-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('companyProfile', 'companyName logoUrl city country industry')
      .lean(),
    Campaign.countDocuments(filter),
  ]);

  // Annotate saved state for logged-in creators
  let savedIds = new Set();
  if (req.user?.role === 'creator') {
    const saved = await SavedCampaign.find({
      creator: req.user._id,
      campaign: { $in: items.map((i) => i._id) },
    }).lean();
    savedIds = new Set(saved.map((s) => String(s.campaign)));
  }

  res.json({
    success: true,
    items: items.map((c) => ({ ...c, isSaved: savedIds.has(String(c._id)) })),
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
});

// GET /api/campaigns/featured  (public landing preview)
export const getFeatured = asyncHandler(async (_req, res) => {
  const items = await Campaign.find({ status: 'active', moderation: { $ne: 'removed' } })
    .sort('-isFeatured -createdAt')
    .limit(6)
    .populate('companyProfile', 'companyName logoUrl city country industry')
    .lean();
  res.json({ success: true, items });
});

// GET /api/campaigns/:id
export const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate(
    'companyProfile',
    'companyName logoUrl bannerUrl city country industry description website ratingAvg ratingCount'
  );
  if (!campaign) throw ApiError.notFound('Campaign not found');

  const isOwner = req.user && String(campaign.company) === String(req.user._id);
  if (!isOwner) {
    await Campaign.updateOne({ _id: campaign._id }, { $inc: { viewsCount: 1 } });
  }

  let myApplication = null;
  let isSaved = false;
  if (req.user?.role === 'creator') {
    myApplication = await Application.findOne({
      campaign: campaign._id,
      creator: req.user._id,
    }).lean();
    isSaved = Boolean(await SavedCampaign.exists({ creator: req.user._id, campaign: campaign._id }));
  }

  res.json({ success: true, campaign, isOwner, myApplication, isSaved });
});

// PUT /api/campaigns/:id  (company owner)
export const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (String(campaign.company) !== String(req.user._id)) throw ApiError.forbidden();

  const blocked = ['company', 'companyProfile', 'applicationsCount', 'acceptedCount', 'viewsCount'];
  for (const key of Object.keys(req.body)) {
    if (!blocked.includes(key)) campaign[key] = req.body[key];
  }
  await campaign.save();
  res.json({ success: true, campaign });
});

// PATCH /api/campaigns/:id/status  { status }  (company owner)
export const setStatus = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (String(campaign.company) !== String(req.user._id)) throw ApiError.forbidden();
  campaign.status = req.body.status;
  await campaign.save();
  res.json({ success: true, campaign });
});

// POST /api/campaigns/:id/media  (company owner, multipart: banner, images[])
export const uploadCampaignMedia = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (String(campaign.company) !== String(req.user._id)) throw ApiError.forbidden();

  if (req.files?.banner?.[0]) {
    const r = await uploadBuffer(req.files.banner[0].buffer, 'influconnect/campaigns', 'image', req.files.banner[0].mimetype);
    campaign.bannerUrl = r.url;
  }
  if (req.files?.images?.length) {
    for (const f of req.files.images) {
      const r = await uploadBuffer(f.buffer, 'influconnect/campaigns', 'image', f.mimetype);
      campaign.images.push(r.url);
    }
  }
  await campaign.save();
  res.json({ success: true, campaign });
});

// DELETE /api/campaigns/:id  (company owner)
export const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (String(campaign.company) !== String(req.user._id)) throw ApiError.forbidden();
  await campaign.deleteOne();
  await Application.deleteMany({ campaign: campaign._id });
  res.json({ success: true, message: 'Campaign deleted' });
});

// GET /api/campaigns/:id/applications  (company owner)
export const getCampaignApplications = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (String(campaign.company) !== String(req.user._id)) throw ApiError.forbidden();

  const filter = { campaign: campaign._id };
  if (req.query.status) filter.status = req.query.status;
  const applications = await Application.find(filter)
    .sort('-createdAt')
    .populate('creator', 'name isAdminVerified')
    .lean();
  res.json({ success: true, campaign: { _id: campaign._id, title: campaign.title }, applications });
});
