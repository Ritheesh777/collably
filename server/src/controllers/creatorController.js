import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { uploadBuffer } from '../config/cloudinary.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { Application } from '../models/Application.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { Collaboration } from '../models/Collaboration.js';
import { tierFor } from '../utils/tiers.js';
import { quotaFor } from '../utils/quota.js';
import {
  hasAcceptedCollaboration,
  sanitizeCreatorProfile,
  maskedContact,
} from '../utils/privacy.js';

// GET /api/creator/me
export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Creator profile not found');
  res.json({ success: true, profile });
});

// PUT /api/creator/me
export const updateMyProfile = asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'bio', 'city', 'state', 'country', 'categories'];
  const update = {};
  for (const key of allowed) if (key in req.body) update[key] = req.body[key];

  const profile = await CreatorProfile.findOneAndUpdate({ user: req.user._id }, update, {
    new: true,
    runValidators: true,
  });
  if (!profile) throw ApiError.notFound('Creator profile not found');

  if (update.fullName) await User.findByIdAndUpdate(req.user._id, { name: update.fullName });
  if (!req.user.profileCompleted)
    await User.findByIdAndUpdate(req.user._id, { profileCompleted: true });

  res.json({ success: true, profile });
});

// PATCH /api/creator/me/avatar  (multipart: avatar)
export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image provided');
  const r = await uploadBuffer(req.file.buffer, 'influconnect/creator/avatars', 'image', req.file.mimetype);
  const profile = await CreatorProfile.findOneAndUpdate(
    { user: req.user._id },
    { avatarUrl: r.url },
    { new: true }
  );
  res.json({ success: true, profile });
});

// PUT /api/creator/me/socials  (full replace of the socials array)
export const updateSocials = asyncHandler(async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Creator profile not found');
  profile.socials = req.body.socials || [];
  await profile.save(); // triggers totalFollowers recompute
  res.json({ success: true, profile });
});

// POST /api/creator/me/portfolio  (multipart: files[] + type/title) OR json url
export const addPortfolioItems = asyncHandler(async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Creator profile not found');

  const items = [];
  if (req.files?.length) {
    for (const f of req.files) {
      const isPdf = f.mimetype.includes('pdf');
      const isVideo = f.mimetype.includes('video');
      const r = await uploadBuffer(f.buffer, 'influconnect/creator/portfolio', 'auto', f.mimetype);
      items.push({
        type: isPdf ? 'pdf' : isVideo ? 'video' : 'image',
        title: f.originalname,
        url: r.url,
        publicId: r.publicId || '',
      });
    }
  }
  if (req.body.url) {
    items.push({ type: req.body.type || 'image', title: req.body.title || '', url: req.body.url });
  }
  if (!items.length) throw ApiError.badRequest('No portfolio content provided');

  profile.portfolio.push(...items);
  await profile.save();
  res.status(201).json({ success: true, profile });
});

// DELETE /api/creator/me/portfolio/:itemId
export const removePortfolioItem = asyncHandler(async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Creator profile not found');
  profile.portfolio = profile.portfolio.filter((p) => String(p._id) !== req.params.itemId);
  await profile.save();
  res.json({ success: true, profile });
});

// PATCH /api/creator/me/media-kit (multipart: file)
export const updateMediaKit = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');
  const r = await uploadBuffer(req.file.buffer, 'influconnect/creator/mediakit', 'auto', req.file.mimetype);
  const profile = await CreatorProfile.findOneAndUpdate(
    { user: req.user._id },
    { mediaKitUrl: r.url },
    { new: true }
  );
  res.json({ success: true, profile });
});

// GET /api/creator/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;
  const [applicationsSent, accepted, pending, completedCollabs] = await Promise.all([
    Application.countDocuments({ creator: creatorId }),
    Application.countDocuments({ creator: creatorId, status: 'accepted' }),
    Application.countDocuments({ creator: creatorId, status: 'pending' }),
    Collaboration.countDocuments({ creator: creatorId, status: 'completed' }),
  ]);
  const recentApplications = await Application.find({ creator: creatorId })
    .sort('-createdAt')
    .limit(5)
    .populate('campaign', 'title status')
    .lean();
  res.json({
    success: true,
    stats: { applicationsSent, accepted, pending, completedCollabs },
    tier: tierFor(completedCollabs),
    quota: await quotaFor(req.user, 'creator'), // §35
    recentApplications,
  });
});

// GET /api/creator/:id  (public profile — as seen by a company)
export const getPublicCreator = asyncHandler(async (req, res) => {
  const doc = await CreatorProfile.findOne({ user: req.params.id })
    .populate('user', 'name isAdminVerified createdAt email phone')
    .lean();
  if (!doc) throw ApiError.notFound('Creator not found');

  const reviews = await Review.find({ subject: req.params.id })
    .sort('-createdAt')
    .limit(20)
    .populate('author', 'name')
    .lean();

  const completed = await Collaboration.countDocuments({
    creator: req.params.id,
    status: 'completed',
  });

  // Contact details only after a mutually accepted collaboration (§4, §16)
  const unlocked =
    req.user?.role === 'admin' || (await hasAcceptedCollaboration(req.user?._id, req.params.id));

  res.json({
    success: true,
    profile: sanitizeCreatorProfile(doc, unlocked),
    contactUnlocked: unlocked,
    contact: unlocked
      ? { email: doc.user?.email, phone: doc.user?.phone }
      : maskedContact(doc.user),
    reviews,
    tier: tierFor(completed),
  });
});

// GET /api/creator  (search creators — used by companies for Method Two/invitations)
export const searchCreators = asyncHandler(async (req, res) => {
  const { q, city, state, country, platform, minFollowers, maxFollowers, category, page = 1, limit = 12 } =
    req.query;
  const filter = {};
  if (q) filter.$or = [{ fullName: new RegExp(q, 'i') }, { username: new RegExp(q, 'i') }];
  if (city) filter.city = new RegExp(city, 'i');
  if (state) filter.state = new RegExp(state, 'i');
  if (country) filter.country = new RegExp(country, 'i');
  if (category) filter.categories = category;
  if (platform) filter['socials.platform'] = platform;
  if (minFollowers || maxFollowers) {
    filter.totalFollowers = {};
    if (minFollowers) filter.totalFollowers.$gte = Number(minFollowers);
    if (maxFollowers) filter.totalFollowers.$lte = Number(maxFollowers);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    CreatorProfile.find(filter)
      .sort('-totalFollowers -ratingAvg')
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name isAdminVerified status')
      .lean(),
    CreatorProfile.countDocuments(filter),
  ]);

  // Search results never expose handles/contact — discovery is allowed, contact is not (§4)
  const visible = items
    .filter((c) => c.user && c.user.status === 'active')
    .map((c) => sanitizeCreatorProfile(c, false));

  res.json({
    success: true,
    items: visible,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});
