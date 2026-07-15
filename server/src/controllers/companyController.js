import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { uploadBuffer } from '../config/cloudinary.js';
import { CompanyProfile } from '../models/CompanyProfile.js';
import { Campaign } from '../models/Campaign.js';
import { Application } from '../models/Application.js';
import { Collaboration } from '../models/Collaboration.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import {
  hasAcceptedCollaboration,
  sanitizeCompanyProfile,
  maskedContact,
} from '../utils/privacy.js';
import { quotaFor } from '../utils/quota.js';

// GET /api/company/me
export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await CompanyProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Company profile not found');
  res.json({ success: true, profile });
});

// PUT /api/company/me
export const updateMyProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'companyName',
    'industry',
    'description',
    'website',
    'address',
    'city',
    'state',
    'country',
  ];
  const update = {};
  for (const key of allowed) if (key in req.body) update[key] = req.body[key];

  const profile = await CompanyProfile.findOneAndUpdate({ user: req.user._id }, update, {
    new: true,
    runValidators: true,
  });
  if (!profile) throw ApiError.notFound('Company profile not found');

  if (update.companyName) await User.findByIdAndUpdate(req.user._id, { name: update.companyName });
  // First save marks the profile complete
  if (!req.user.profileCompleted)
    await User.findByIdAndUpdate(req.user._id, { profileCompleted: true });

  res.json({ success: true, profile });
});

// PATCH /api/company/me/media  (multipart: logo, banner)
export const updateMedia = asyncHandler(async (req, res) => {
  const update = {};
  if (req.files?.logo?.[0]) {
    const r = await uploadBuffer(req.files.logo[0].buffer, 'influconnect/company/logos', 'image', req.files.logo[0].mimetype);
    update.logoUrl = r.url;
  }
  if (req.files?.banner?.[0]) {
    const r = await uploadBuffer(
      req.files.banner[0].buffer,
      'influconnect/company/banners',
      'image',
      req.files.banner[0].mimetype
    );
    update.bannerUrl = r.url;
  }
  if (!Object.keys(update).length) throw ApiError.badRequest('No logo or banner provided');
  const profile = await CompanyProfile.findOneAndUpdate({ user: req.user._id }, update, {
    new: true,
  });
  res.json({ success: true, profile });
});

// GET /api/company/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const companyId = req.user._id;
  const [activeCampaigns, totalCampaigns, pendingApplications, acceptedCreators] = await Promise.all(
    [
      Campaign.countDocuments({ company: companyId, status: 'active' }),
      Campaign.countDocuments({ company: companyId }),
      Application.countDocuments({ company: companyId, status: 'pending' }),
      Application.countDocuments({ company: companyId, status: 'accepted' }),
    ]
  );

  const recentCampaigns = await Campaign.find({ company: companyId })
    .sort('-createdAt')
    .limit(5)
    .lean();

  const recentApplications = await Application.find({ company: companyId })
    .sort('-createdAt')
    .limit(5)
    .populate('creator', 'name')
    .populate('campaign', 'title')
    .lean();

  res.json({
    success: true,
    stats: { activeCampaigns, totalCampaigns, pendingApplications, acceptedCreators },
    quota: await quotaFor(req.user, 'company'), // §35 free collaborations remaining
    recentCampaigns,
    recentApplications,
  });
});

// GET /api/company/:id  (public profile view, e.g. shown to creators)
export const getPublicCompany = asyncHandler(async (req, res) => {
  const doc = await CompanyProfile.findOne({ user: req.params.id })
    .populate('user', 'name isAdminVerified createdAt email phone')
    .lean();
  if (!doc) throw ApiError.notFound('Company not found');

  const reviews = await Review.find({ subject: req.params.id })
    .sort('-createdAt')
    .limit(20)
    .populate('author', 'name')
    .lean();

  // Website/address/contact stay hidden until collaboration is accepted (§4, §16)
  const unlocked =
    req.user?.role === 'admin' || (await hasAcceptedCollaboration(req.user?._id, req.params.id));

  res.json({
    success: true,
    profile: sanitizeCompanyProfile(doc, unlocked),
    contactUnlocked: unlocked,
    contact: unlocked
      ? { email: doc.user?.email, phone: doc.user?.phone }
      : maskedContact(doc.user),
    reviews,
  });
});
