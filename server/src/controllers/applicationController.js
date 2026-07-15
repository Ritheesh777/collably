import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { Application } from '../models/Application.js';
import { Campaign, rangesForFollowerCount } from '../models/Campaign.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { Collaboration } from '../models/Collaboration.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { notify } from '../utils/notify.js';
import { assertCanCollaborate } from '../utils/quota.js';

/**
 * Creates the private conversation for a collaboration.
 *
 * BUSINESS RULE (v1 change request §1, §6): chat unlocks ONLY once both sides
 * have agreed — i.e. a company accepts an application, or a creator accepts an
 * invitation. It must NOT be created merely because someone applied/invited,
 * otherwise the parties could talk (and swap contacts) before agreeing.
 */
async function ensureConversation({ campaign, company, creator, application, collaboration }) {
  let convo = await Conversation.findOne({
    campaign,
    participants: { $all: [company, creator] },
  });
  if (!convo) {
    convo = await Conversation.create({
      campaign,
      application,
      collaboration,
      participants: [company, creator],
      unread: {},
    });
  } else if (collaboration && !convo.collaboration) {
    convo.collaboration = collaboration;
    await convo.save();
  }
  return convo;
}

// POST /api/applications  (creator applies) { campaignId, message, portfolioSnapshot }
export const applyToCampaign = asyncHandler(async (req, res) => {
  const { campaignId, message = '', portfolioSnapshot = [] } = req.body;
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (campaign.status !== 'active') throw ApiError.badRequest('Campaign is not accepting applications');

  // §8 — creators may only apply to campaigns matching their follower range
  const myProfile = await CreatorProfile.findOne({ user: req.user._id })
    .select('totalFollowers')
    .lean();
  const eligible = rangesForFollowerCount(myProfile?.totalFollowers || 0);
  if (campaign.followerRange && !eligible.includes(campaign.followerRange)) {
    throw ApiError.forbidden(
      `This campaign requires ${campaign.followerRange} followers. Your profile doesn't match that range.`
    );
  }

  const existing = await Application.findOne({ campaign: campaignId, creator: req.user._id });
  if (existing && existing.status !== 'withdrawn')
    throw ApiError.conflict('You have already applied to this campaign');

  let application;
  if (existing) {
    existing.status = 'pending';
    existing.message = message;
    existing.portfolioSnapshot = portfolioSnapshot;
    existing.origin = 'application';
    application = await existing.save();
  } else {
    application = await Application.create({
      campaign: campaignId,
      company: campaign.company,
      creator: req.user._id,
      origin: 'application',
      message,
      portfolioSnapshot,
    });
    await Campaign.updateOne({ _id: campaignId }, { $inc: { applicationsCount: 1 } });
  }

  // NOTE: no conversation is created here. Chat stays locked until the company
  // accepts (v1 change request §2, §6).

  await notify({
    user: campaign.company,
    type: 'application_received',
    title: 'New application received',
    body: `${req.user.name} applied to "${campaign.title}"`,
    link: `/company/campaigns/${campaign._id}/applications`,
    meta: { campaignId: campaign._id, applicationId: application._id },
  });

  res.status(201).json({ success: true, application });
});

// POST /api/applications/invite  (company invites creator) { campaignId, creatorId, message }
export const inviteCreator = asyncHandler(async (req, res) => {
  const { campaignId, creatorId, message = '' } = req.body;
  const campaign = await Campaign.findOne({ _id: campaignId, company: req.user._id });
  if (!campaign) throw ApiError.notFound('Campaign not found');

  const existing = await Application.findOne({ campaign: campaignId, creator: creatorId });
  if (existing && existing.status !== 'withdrawn')
    throw ApiError.conflict('This creator already has an application/invitation for this campaign');

  const application =
    existing ||
    (await Application.create({
      campaign: campaignId,
      company: req.user._id,
      creator: creatorId,
      origin: 'invitation',
      message,
    }));
  if (existing) {
    existing.status = 'pending';
    existing.origin = 'invitation';
    existing.message = message;
    await existing.save();
  }

  // No conversation yet — the creator must accept the invitation first (§2, §6).

  await notify({
    user: creatorId,
    type: 'invitation_received',
    title: 'You have a campaign invitation',
    body: `${req.user.name} invited you to "${campaign.title}"`,
    link: `/creator/applications`,
    meta: { campaignId: campaign._id, applicationId: application._id },
  });

  res.status(201).json({ success: true, application });
});

// GET /api/applications/mine  (creator's own applications)
export const getMyApplications = asyncHandler(async (req, res) => {
  const filter = { creator: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const items = await Application.find(filter)
    .sort('-createdAt')
    .populate({
      path: 'campaign',
      select: 'title status category deadline company',
      populate: { path: 'companyProfile', select: 'companyName logoUrl' },
    })
    .lean();
  res.json({ success: true, items });
});

// GET /api/applications/received  (company: all applications across campaigns)
export const getReceivedApplications = asyncHandler(async (req, res) => {
  const filter = { company: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const items = await Application.find(filter)
    .sort('-createdAt')
    .populate('creator', 'name isAdminVerified')
    .populate('campaign', 'title')
    .lean();
  res.json({ success: true, items });
});

// PATCH /api/applications/:id/decision  { decision: accepted|rejected } (company)
export const decideApplication = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  const application = await Application.findById(req.params.id).populate('campaign', 'title company');
  if (!application) throw ApiError.notFound('Application not found');
  if (String(application.company) !== String(req.user._id)) throw ApiError.forbidden();
  if (application.status !== 'pending')
    throw ApiError.badRequest(`Application already ${application.status}`);

  application.status = decision;
  application.respondedAt = new Date();
  await application.save();

  if (decision === 'accepted') {
    // §6/§36 — check quota for BOTH sides immediately before creating the
    // collaboration. A collaboration consumes one free slot from each party.
    await assertCanCollaborate(req.user, 'company');
    const creatorUser = await User.findById(application.creator);
    await assertCanCollaborate(creatorUser, 'creator');

    // Mutual agreement reached → create the collaboration AND unlock chat (§3, §6)
    const collab = await Collaboration.create({
      campaign: application.campaign._id,
      application: application._id,
      company: application.company,
      creator: application.creator,
    });
    await ensureConversation({
      campaign: application.campaign._id,
      company: application.company,
      creator: application.creator,
      application: application._id,
      collaboration: collab._id,
    });
    await Campaign.updateOne({ _id: application.campaign._id }, { $inc: { acceptedCount: 1 } });
  }

  await notify({
    user: application.creator,
    type: decision === 'accepted' ? 'application_accepted' : 'application_rejected',
    title: `Application ${decision}`,
    body: `Your application to "${application.campaign.title}" was ${decision}`,
    link: `/creator/applications`,
    meta: { campaignId: application.campaign._id },
  });

  res.json({ success: true, application });
});

// PATCH /api/applications/:id/respond-invite  { accept: bool } (creator)
export const respondToInvitation = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate('campaign', 'title');
  if (!application) throw ApiError.notFound('Invitation not found');
  if (String(application.creator) !== String(req.user._id)) throw ApiError.forbidden();
  if (application.origin !== 'invitation' || application.status !== 'pending')
    throw ApiError.badRequest('No pending invitation to respond to');

  if (req.body.accept) {
    // §6/§36 — quota check for both parties BEFORE the collaboration exists
    await assertCanCollaborate(req.user, 'creator');
    const companyUser = await User.findById(application.company);
    await assertCanCollaborate(companyUser, 'company');

    application.status = 'accepted';
    application.respondedAt = new Date();
    await application.save();
    // Creator accepted the invitation → collaboration + chat unlock (§3, §6)
    const collab = await Collaboration.create({
      campaign: application.campaign._id,
      application: application._id,
      company: application.company,
      creator: application.creator,
    });
    await ensureConversation({
      campaign: application.campaign._id,
      company: application.company,
      creator: application.creator,
      application: application._id,
      collaboration: collab._id,
    });
    await Campaign.updateOne({ _id: application.campaign._id }, { $inc: { acceptedCount: 1 } });
  } else {
    application.status = 'rejected';
    application.respondedAt = new Date();
    await application.save();
  }

  await notify({
    user: application.company,
    type: 'application_accepted',
    title: `Invitation ${application.status}`,
    body: `${req.user.name} ${application.status} your invitation to "${application.campaign.title}"`,
    link: `/company/campaigns/${application.campaign._id}/applications`,
  });

  res.json({ success: true, application });
});

// PATCH /api/applications/:id/withdraw  (creator)
export const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('Application not found');
  if (String(application.creator) !== String(req.user._id)) throw ApiError.forbidden();
  if (application.status !== 'pending')
    throw ApiError.badRequest('Only pending applications can be withdrawn');
  application.status = 'withdrawn';
  await application.save();
  await Campaign.updateOne(
    { _id: application.campaign, applicationsCount: { $gt: 0 } },
    { $inc: { applicationsCount: -1 } }
  );
  res.json({ success: true, application });
});
