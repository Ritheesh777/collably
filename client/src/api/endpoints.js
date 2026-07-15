import { api } from './client.js';

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  registerCompany: (data) => api.post('/auth/register/company', data).then((r) => r.data),
  registerCreator: (data) => api.post('/auth/register/creator', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }).then((r) => r.data),
  resendVerification: () => api.post('/auth/resend-verification').then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }).then((r) => r.data),
  changePassword: (data) => api.patch('/auth/change-password', data).then((r) => r.data),
};

// ── Company ───────────────────────────────────────────
export const companyApi = {
  me: () => api.get('/company/me').then((r) => r.data),
  update: (data) => api.put('/company/me', data).then((r) => r.data),
  updateMedia: (form) => api.patch('/company/me/media', form).then((r) => r.data),
  dashboard: () => api.get('/company/dashboard').then((r) => r.data),
  public: (id) => api.get(`/company/${id}`).then((r) => r.data),
};

// ── Creator ───────────────────────────────────────────
export const creatorApi = {
  me: () => api.get('/creator/me').then((r) => r.data),
  update: (data) => api.put('/creator/me', data).then((r) => r.data),
  updateAvatar: (form) => api.patch('/creator/me/avatar', form).then((r) => r.data),
  updateSocials: (socials) => api.put('/creator/me/socials', { socials }).then((r) => r.data),
  addPortfolio: (form) => api.post('/creator/me/portfolio', form).then((r) => r.data),
  removePortfolio: (itemId) => api.delete(`/creator/me/portfolio/${itemId}`).then((r) => r.data),
  updateMediaKit: (form) => api.patch('/creator/me/media-kit', form).then((r) => r.data),
  dashboard: () => api.get('/creator/dashboard').then((r) => r.data),
  public: (id) => api.get(`/creator/${id}`).then((r) => r.data),
  search: (params) => api.get('/creator', { params }).then((r) => r.data),
};

// ── Campaigns ─────────────────────────────────────────
export const campaignApi = {
  browse: (params) => api.get('/campaigns', { params }).then((r) => r.data),
  featured: () => api.get('/campaigns/featured').then((r) => r.data),
  mine: (params) => api.get('/campaigns/mine', { params }).then((r) => r.data),
  get: (id) => api.get(`/campaigns/${id}`).then((r) => r.data),
  // idempotencyKey ensures a double-click / retry can never create duplicates
  create: (data, idempotencyKey) =>
    api
      .post('/campaigns', data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined)
      .then((r) => r.data),
  update: (id, data) => api.put(`/campaigns/${id}`, data).then((r) => r.data),
  setStatus: (id, status) => api.patch(`/campaigns/${id}/status`, { status }).then((r) => r.data),
  uploadMedia: (id, form) => api.post(`/campaigns/${id}/media`, form).then((r) => r.data),
  remove: (id) => api.delete(`/campaigns/${id}`).then((r) => r.data),
  applications: (id, params) =>
    api.get(`/campaigns/${id}/applications`, { params }).then((r) => r.data),
};

// ── Applications ──────────────────────────────────────
export const applicationApi = {
  apply: (data) => api.post('/applications', data).then((r) => r.data),
  invite: (data) => api.post('/applications/invite', data).then((r) => r.data),
  mine: (params) => api.get('/applications/mine', { params }).then((r) => r.data),
  received: (params) => api.get('/applications/received', { params }).then((r) => r.data),
  decide: (id, decision) =>
    api.patch(`/applications/${id}/decision`, { decision }).then((r) => r.data),
  respondInvite: (id, accept) =>
    api.patch(`/applications/${id}/respond-invite`, { accept }).then((r) => r.data),
  withdraw: (id) => api.patch(`/applications/${id}/withdraw`).then((r) => r.data),
};

// ── Chat ──────────────────────────────────────────────
export const chatApi = {
  conversations: (params) => api.get('/chat/conversations', { params }).then((r) => r.data),
  messages: (id) => api.get(`/chat/conversations/${id}/messages`).then((r) => r.data),
  send: (id, data) => api.post(`/chat/conversations/${id}/messages`, data).then((r) => r.data),
  // §26/§27 — category (primary|general|archived) and mute are per-user
  setPrefs: (id, data) => api.patch(`/chat/conversations/${id}/prefs`, data).then((r) => r.data),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`).then((r) => r.data),
  deleteMessage: (id) => api.delete(`/chat/messages/${id}`).then((r) => r.data),
  // §25 — consumes the photo; the server drops the URL after this call
  viewOnce: (id) => api.post(`/chat/messages/${id}/view`).then((r) => r.data),
  blocked: () => api.get('/chat/block').then((r) => r.data),
  block: (userId, reason) => api.post('/chat/block', { userId, reason }).then((r) => r.data),
  unblock: (userId) => api.delete(`/chat/block/${userId}`).then((r) => r.data),
};

// §13–§16 — ranking, trophies, leaderboard
export const rankingApi = {
  me: () => api.get('/ranking/me').then((r) => r.data),
  user: (id) => api.get(`/ranking/user/${id}`).then((r) => r.data),
  leaderboard: (params) => api.get('/ranking/leaderboard', { params }).then((r) => r.data),
};

// §33/§34 — help, support tickets, account deletion
export const supportApi = {
  info: () => api.get('/support/info').then((r) => r.data),
  tickets: () => api.get('/support/tickets').then((r) => r.data),
  createTicket: (data) => api.post('/support/tickets', data).then((r) => r.data),
  deleteAccount: (password, confirm) =>
    api.delete('/support/account', { data: { password, confirm } }).then((r) => r.data),
};

// ── Collaborations / Reviews / Notifications / Saved / Complaints ─
export const collabApi = {
  mine: (params) => api.get('/collaborations', { params }).then((r) => r.data),
  complete: (id) => api.patch(`/collaborations/${id}/complete`).then((r) => r.data),
};
export const reviewApi = {
  create: (data) => api.post('/reviews', data).then((r) => r.data),
  mine: () => api.get('/reviews/mine').then((r) => r.data),
  forUser: (userId) => api.get(`/reviews/user/${userId}`).then((r) => r.data),
};
export const notificationApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  clearAll: () => api.delete('/notifications').then((r) => r.data),
  preferences: (data) => api.patch('/notifications/preferences', data).then((r) => r.data),
};
export const savedApi = {
  list: () => api.get('/saved').then((r) => r.data),
  toggle: (campaignId) => api.post(`/saved/${campaignId}`).then((r) => r.data),
};
export const complaintApi = {
  create: (data) => api.post('/complaints', data).then((r) => r.data),
  mine: () => api.get('/complaints/mine').then((r) => r.data),
};
export const publicApi = {
  contact: (data) => api.post('/public/contact', data).then((r) => r.data),
  stats: () => api.get('/public/stats').then((r) => r.data),
};

// ── Media ─────────────────────────────────────────────
export const mediaApi = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/media', form).then((r) => r.data);
  },
};

// ── Subscriptions (Razorpay) ──────────────────────────
export const subscriptionApi = {
  plans: () => api.get('/subscriptions/plans').then((r) => r.data),
  quote: (planCode, couponCode) =>
    api.post('/subscriptions/quote', { planCode, couponCode }).then((r) => r.data),
  checkout: (planCode, couponCode) =>
    api.post('/subscriptions/checkout', { planCode, couponCode }).then((r) => r.data),
  verify: (payload) => api.post('/subscriptions/verify', payload).then((r) => r.data),
  me: () => api.get('/subscriptions/me').then((r) => r.data),
};

// ── Admin ─────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data),
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  user: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  setUserStatus: (id, status) =>
    api.patch(`/admin/users/${id}/status`, { status }).then((r) => r.data),
  verifyUser: (id, verified) =>
    api.patch(`/admin/users/${id}/verify`, { verified }).then((r) => r.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  campaigns: (params) => api.get('/admin/campaigns', { params }).then((r) => r.data),
  moderateCampaign: (id, data) =>
    api.patch(`/admin/campaigns/${id}/moderation`, data).then((r) => r.data),
  complaints: (params) => api.get('/admin/complaints', { params }).then((r) => r.data),
  resolveComplaint: (id, data) =>
    api.patch(`/admin/complaints/${id}`, data).then((r) => r.data),

  // §29–§32 — relationship inspection (admin-only, unmasked)
  inspectCompany: (id) => api.get(`/admin/inspect/company/${id}`).then((r) => r.data),
  inspectCreator: (id) => api.get(`/admin/inspect/creator/${id}`).then((r) => r.data),
  inspectCampaign: (id) => api.get(`/admin/inspect/campaign/${id}`).then((r) => r.data),

  // §11/§13/§16/§33 — platform configuration
  settings: () => api.get('/admin/settings').then((r) => r.data),
  updateSettings: (data) => api.patch('/admin/settings', data).then((r) => r.data),

  plans: () => api.get('/admin/plans').then((r) => r.data),
  createPlan: (data) => api.post('/admin/plans', data).then((r) => r.data),
  updatePlan: (id, data) => api.patch(`/admin/plans/${id}`, data).then((r) => r.data),
  deletePlan: (id) => api.delete(`/admin/plans/${id}`).then((r) => r.data),

  coupons: () => api.get('/admin/coupons').then((r) => r.data),
  createCoupon: (data) => api.post('/admin/coupons', data).then((r) => r.data),
  updateCoupon: (id, data) => api.patch(`/admin/coupons/${id}`, data).then((r) => r.data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`).then((r) => r.data),

  // Are the Razorpay keys live and working? (creates + abandons a ₹1 order)
  paymentHealth: () => api.get('/admin/payments/health').then((r) => r.data),

  tickets: (params) => api.get('/admin/tickets', { params }).then((r) => r.data),
  respondTicket: (id, data) => api.patch(`/admin/tickets/${id}`, data).then((r) => r.data),
};
