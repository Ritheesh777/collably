import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import * as admin from '../controllers/adminController.js';
import * as inspect from '../controllers/adminInspectController.js';
import * as config from '../controllers/adminConfigController.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', admin.getDashboard);

router.get('/users', admin.listUsers);
router.get('/users/:id', admin.getUser);
router.patch(
  '/users/:id/status',
  validate(z.object({ status: z.enum(['active', 'suspended', 'banned']) })),
  admin.setUserStatus
);
router.patch(
  '/users/:id/verify',
  validate(z.object({ verified: z.boolean() })),
  admin.setUserVerified
);
router.delete('/users/:id', admin.deleteUser);

router.get('/campaigns', admin.listCampaigns);
router.patch('/campaigns/:id/moderation', admin.moderateCampaign);

router.get('/complaints', admin.listComplaints);
router.patch('/complaints/:id', admin.resolveComplaint);

// Advanced relationship inspection (§29–§32) — admin-only unmasked views
router.get('/inspect/company/:id', inspect.inspectCompany);
router.get('/inspect/creator/:id', inspect.inspectCreator);
router.get('/inspect/campaign/:id', inspect.inspectCampaign);

// Platform configuration (§11, §13, §16, §33)
router.get('/settings', config.getSettings);
router.patch('/settings', config.updateSettings);

// Subscription plans (§8)
router.get('/plans', config.listPlans);
router.post('/plans', config.createPlan);
router.patch('/plans/:id', config.updatePlan);
router.delete('/plans/:id', config.deletePlan);

// Coupons (§12)
router.get('/coupons', config.listCoupons);
router.post('/coupons', config.createCoupon);
router.patch('/coupons/:id', config.updateCoupon);
router.delete('/coupons/:id', config.deleteCoupon);

// Is Razorpay actually working? (§8) — creates and abandons a ₹1 order
router.get('/payments/health', config.paymentHealth);

// Support inbox (§33)
router.get('/tickets', config.listTickets);
router.patch('/tickets/:id', config.respondTicket);

export default router;
