import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import creatorRoutes from './routes/creatorRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import { razorpayWebhook } from './controllers/subscriptionController.js';
import {
  savedRouter,
  collabRouter,
  complaintRouter,
  mediaRouter,
  publicRouter,
  rankingRouter,
} from './routes/miscRoutes.js';

export function createApp() {
  const app = express();

  // Hosts like Render/Railway put a load balancer in front of us. Without this,
  // req.ip is the balancer's address for EVERY visitor — which makes the auth
  // rate limiter treat all users as one client and lock everybody out (429).
  // `1` = trust exactly one proxy hop (never `true`, which allows IP spoofing).
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: [...env.clientOrigins, 'http://localhost:5173', 'capacitor://localhost', 'http://localhost'],
      credentials: true,
    })
  );
  // Razorpay's webhook signature is computed over the RAW body — parsing it as
  // JSON first would change the bytes and every signature check would fail.
  // This must be registered before express.json().
  app.post(
    '/api/subscriptions/webhook',
    express.raw({ type: 'application/json' }),
    razorpayWebhook
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  // Log requests in every environment — without this, production errors are invisible.
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/api/health', (_req, res) =>
    res.json({ success: true, service: 'Collably API', time: new Date().toISOString() })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/company', companyRoutes);
  app.use('/api/creator', creatorRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/saved', savedRouter);
  app.use('/api/collaborations', collabRouter);
  app.use('/api/complaints', complaintRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/ranking', rankingRouter);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
