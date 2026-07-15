import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { PageLoader } from './components/ui.jsx';

// Landing loads eagerly (first paint); everything else is code-split so a
// low-end device only downloads the screens it actually opens.
import Landing from './pages/public/Landing.jsx';

const HowItWorks = lazy(() => import('./pages/public/HowItWorks.jsx'));
const About = lazy(() => import('./pages/public/About.jsx'));
const Legal = lazy(() => import('./pages/public/Legal.jsx'));
const BrowsePublic = lazy(() => import('./pages/public/BrowsePublic.jsx'));
const CampaignPublic = lazy(() => import('./pages/public/CampaignPublic.jsx'));
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'));

const Login = lazy(() => import('./pages/auth/Login.jsx'));
const RegisterChoice = lazy(() => import('./pages/auth/RegisterChoice.jsx'));
const RegisterCompany = lazy(() => import('./pages/auth/RegisterCompany.jsx'));
const RegisterCreator = lazy(() => import('./pages/auth/RegisterCreator.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail.jsx'));

const CompanyDashboard = lazy(() => import('./pages/company/Dashboard.jsx'));
const CompanyProfileSetup = lazy(() => import('./pages/company/ProfileSetup.jsx'));
const CompanyProfile = lazy(() => import('./pages/company/Profile.jsx'));
const MyCampaigns = lazy(() => import('./pages/company/MyCampaigns.jsx'));
const CampaignForm = lazy(() => import('./pages/company/CampaignForm.jsx'));
const CampaignManage = lazy(() => import('./pages/company/CampaignManage.jsx'));
const CampaignApplications = lazy(() => import('./pages/company/CampaignApplications.jsx'));
const AllApplications = lazy(() => import('./pages/company/AllApplications.jsx'));
const FindCreators = lazy(() => import('./pages/company/FindCreators.jsx'));
const CreatorView = lazy(() => import('./pages/company/CreatorView.jsx'));

const CreatorDashboard = lazy(() => import('./pages/creator/Dashboard.jsx'));
const CreatorProfileSetup = lazy(() => import('./pages/creator/ProfileSetup.jsx'));
const CreatorProfile = lazy(() => import('./pages/creator/Profile.jsx'));
const BrowseCampaigns = lazy(() => import('./pages/creator/Browse.jsx'));
const CampaignDetail = lazy(() => import('./pages/creator/CampaignDetail.jsx'));
const MyApplications = lazy(() => import('./pages/creator/MyApplications.jsx'));
const SavedCampaigns = lazy(() => import('./pages/creator/Saved.jsx'));

const Messages = lazy(() => import('./pages/shared/Messages.jsx'));
const Notifications = lazy(() => import('./pages/shared/Notifications.jsx'));
const Reviews = lazy(() => import('./pages/shared/Reviews.jsx'));
const Settings = lazy(() => import('./pages/shared/Settings.jsx'));
const Subscribe = lazy(() => import('./pages/shared/Subscribe.jsx'));
const Support = lazy(() => import('./pages/shared/Support.jsx'));
const CompanyView = lazy(() => import('./pages/shared/CompanyView.jsx'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers.jsx'));
const ManageCampaigns = lazy(() => import('./pages/admin/ManageCampaigns.jsx'));
const Complaints = lazy(() => import('./pages/admin/Complaints.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));
const AdminPlans = lazy(() => import('./pages/admin/Plans.jsx'));
const AdminTickets = lazy(() => import('./pages/admin/Tickets.jsx'));
const Inspect = lazy(() => import('./pages/admin/Inspect.jsx'));

export default function App() {
  const location = useLocation();
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Legal kind="terms" />} />
            <Route path="/privacy" element={<Legal kind="privacy" />} />
            <Route path="/campaigns" element={<BrowsePublic />} />
            <Route path="/campaigns/:id" element={<CampaignPublic />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterChoice />} />
          <Route path="/register/company" element={<RegisterCompany />} />
          <Route path="/register/creator" element={<RegisterCreator />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Company */}
          <Route
            element={
              <ProtectedRoute roles={['company']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/company" element={<CompanyDashboard />} />
            <Route path="/company/profile" element={<CompanyProfile />} />
            <Route path="/company/campaigns" element={<MyCampaigns />} />
            <Route path="/company/campaigns/new" element={<CampaignForm />} />
            <Route path="/company/campaigns/:id/edit" element={<CampaignForm />} />
            <Route path="/company/campaigns/:id" element={<CampaignManage />} />
            <Route path="/company/campaigns/:id/applications" element={<CampaignApplications />} />
            <Route path="/company/applications" element={<AllApplications />} />
            <Route path="/company/creators" element={<FindCreators />} />
            <Route path="/company/creators/:id" element={<CreatorView />} />
          </Route>
          <Route
            path="/company/setup"
            element={
              <ProtectedRoute roles={['company']}>
                <CompanyProfileSetup />
              </ProtectedRoute>
            }
          />

          {/* Creator */}
          <Route
            element={
              <ProtectedRoute roles={['creator']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/creator" element={<CreatorDashboard />} />
            <Route path="/creator/profile" element={<CreatorProfile />} />
            <Route path="/creator/browse" element={<BrowseCampaigns />} />
            <Route path="/creator/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/creator/applications" element={<MyApplications />} />
            <Route path="/creator/saved" element={<SavedCampaigns />} />
          </Route>
          <Route
            path="/creator/setup"
            element={
              <ProtectedRoute roles={['creator']}>
                <CreatorProfileSetup />
              </ProtectedRoute>
            }
          />

          {/* Shared */}
          <Route
            element={
              <ProtectedRoute roles={['company', 'creator']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/support" element={<Support />} />
            {/* §22/§23 — profile navigation needs a destination for BOTH sides:
                a creator clicking a company logo had nowhere to go before. */}
            <Route path="/companies/:id" element={<CompanyView />} />
            <Route path="/creators/:id" element={<CreatorView />} />
          </Route>

          {/* Admin */}
          <Route
            element={
              <ProtectedRoute roles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/campaigns" element={<ManageCampaigns />} />
            <Route path="/admin/complaints" element={<Complaints />} />
            <Route path="/admin/tickets" element={<AdminTickets />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            {/* §29–§32 — relationship inspection, navigable between entities */}
            <Route path="/admin/company/:id" element={<Inspect kind="company" />} />
            <Route path="/admin/creator/:id" element={<Inspect kind="creator" />} />
            <Route path="/admin/campaign/:id" element={<Inspect kind="campaign" />} />
          </Route>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
