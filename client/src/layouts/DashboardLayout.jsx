import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo.jsx';
import { Avatar } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { motion } from '../lib/motion.jsx';
import PremiumBadge, { PremiumPill } from '../components/PremiumBadge.jsx';
import Seo from '../components/Seo.jsx';
import {
  IconDashboard, IconCampaign, IconPlusCircle, IconInbox, IconSearch, IconMessage,
  IconBell, IconStar, IconCompany, IconUser, IconSettings, IconLogout, IconUsers,
  IconFlag, IconSend, IconBookmark, IconMenu, IconX, IconSparkles,
  IconSupport, IconSliders, IconTicket, IconTag,
} from '../components/icons.jsx';

const NAVS = {
  company: [
    { to: '/company', label: 'Dashboard', icon: IconDashboard, end: true },
    { to: '/company/campaigns', label: 'My Campaigns', icon: IconCampaign },
    { to: '/company/campaigns/new', label: 'Create Campaign', icon: IconPlusCircle },
    { to: '/company/applications', label: 'Applications', icon: IconInbox },
    { to: '/company/creators', label: 'Find Creators', icon: IconSearch },
    { to: '/messages', label: 'Messages', icon: IconMessage },
    { to: '/notifications', label: 'Notifications', icon: IconBell },
    { to: '/reviews', label: 'Reviews', icon: IconStar },
    { to: '/subscribe', label: 'Subscription', icon: IconSparkles },
    { to: '/company/profile', label: 'Profile', icon: IconCompany },
    { to: '/support', label: 'Help & Support', icon: IconSupport },
    { to: '/settings', label: 'Settings', icon: IconSettings },
  ],
  creator: [
    { to: '/creator', label: 'Dashboard', icon: IconDashboard, end: true },
    { to: '/creator/browse', label: 'Browse Campaigns', icon: IconSearch },
    { to: '/creator/applications', label: 'My Applications', icon: IconSend },
    { to: '/creator/saved', label: 'Saved', icon: IconBookmark },
    { to: '/messages', label: 'Messages', icon: IconMessage },
    { to: '/notifications', label: 'Notifications', icon: IconBell },
    { to: '/reviews', label: 'Reviews', icon: IconStar },
    { to: '/subscribe', label: 'Subscription', icon: IconSparkles },
    { to: '/creator/profile', label: 'Profile', icon: IconUser },
    { to: '/support', label: 'Help & Support', icon: IconSupport },
    { to: '/settings', label: 'Settings', icon: IconSettings },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: IconDashboard, end: true },
    { to: '/admin/users', label: 'Manage Users', icon: IconUsers },
    { to: '/admin/campaigns', label: 'Manage Campaigns', icon: IconCampaign },
    { to: '/admin/complaints', label: 'Reports', icon: IconFlag },
    { to: '/admin/tickets', label: 'Support Inbox', icon: IconTicket },
    { to: '/admin/plans', label: 'Plans & Coupons', icon: IconTag },
    { to: '/admin/settings', label: 'Settings', icon: IconSliders },
  ],
};

export default function DashboardLayout() {
  const { user, profile, logout } = useAuth();
  // §10 — nav shows the company logo / creator photo, and opens that profile
  const avatarSrc = profile?.logoUrl || profile?.avatarUrl || '';
  const profileHref =
    user?.role === 'company' ? '/company/profile' : user?.role === 'creator' ? '/creator/profile' : '/admin';
  const { unreadNotifications } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const nav = NAVS[user?.role] || [];

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  // Each item is a real bordered button with space between — user feedback:
  // plain text rows with no separation read as "not buttons". Active = solid
  // ink (same treatment as btn-primary) so the current page is unmissable.
  const SideNav = (
    <nav className="flex flex-col gap-1.5 p-3">
      {nav.map((n) => {
        const Icon = n.icon;
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'border-ink-900 bg-ink-900 text-paper shadow-sm'
                  : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-300' : 'text-ink-400'}`}
                  strokeWidth={2.2}
                />
                <span className="flex-1">{n.label}</span>
                {n.label === 'Notifications' && unreadNotifications > 0 && (
                  <span className={`badge ${isActive ? 'bg-brand-500 text-white' : 'bg-accent-500 text-white'}`}>
                    {unreadNotifications}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
      <button
        onClick={doLogout}
        className="mt-2 flex items-center gap-3 rounded-xl border border-rose-200 bg-surface px-3.5 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50"
      >
        <IconLogout className="h-[18px] w-[18px]" strokeWidth={2.2} /> Logout
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Logged-in screens: keep them out of the index entirely. They are
          useless as search results and would eat crawl budget. */}
      <Seo noindex title="Dashboard" />
      {/* Desktop sidebar — sticky full-height so it never drifts with the page */}
      <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-ink-200 lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-ink-200 px-5">
          <Logo to={`/${user?.role}`} />
        </div>
        {SideNav}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="glass-strong absolute left-0 top-0 h-full w-72 shadow-card"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
              <div className="flex h-16 items-center justify-between border-b border-white/40 px-5">
                <Logo to={`/${user?.role}`} />
                <button onClick={() => setOpen(false)} className="text-ink-400"><IconX className="h-5 w-5" /></button>
              </div>
              {SideNav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass safe-top sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/50 px-4">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <IconMenu className="h-6 w-6 text-ink-700" />
          </button>
          <div className="hidden text-sm font-medium capitalize text-ink-400 lg:block">
            {user?.role} workspace
          </div>
          <div className="flex items-center gap-3">
            <Link to="/notifications" className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Notifications">
              <IconBell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications}
                </span>
              )}
            </Link>
            <Link
              to={profileHref}
              className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-ink-100"
              title="Open my profile"
            >
              <Avatar
                src={avatarSrc}
                name={user?.name}
                size={34}
                ring
                premium={user?.subscription?.status === 'active' && new Date(user.subscription.expiresAt) > new Date()}
              />
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink-700 sm:block">{user?.name}</span>
              {user?.subscription?.status === 'active' && new Date(user.subscription.expiresAt) > new Date() && (
                <PremiumBadge size={16} className="hidden sm:inline-block" />
              )}
            </Link>
          </div>
        </header>

        <main key={location.pathname} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 safe-bottom">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
