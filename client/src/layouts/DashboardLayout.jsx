import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo.jsx';
import { Avatar } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { motion } from '../lib/motion.jsx';
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

  const SideNav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {nav.map((n) => {
        const Icon = n.icon;
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-brand-50"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={2} />
                <span className="relative z-10 flex-1">{n.label}</span>
                {n.label === 'Notifications' && unreadNotifications > 0 && (
                  <span className="relative z-10 badge bg-accent-500 text-white">{unreadNotifications}</span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
      <button
        onClick={doLogout}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
      >
        <IconLogout className="h-[18px] w-[18px]" strokeWidth={2} /> Logout
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
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
              <Avatar src={avatarSrc} name={user?.name} size={34} ring />
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink-700 sm:block">{user?.name}</span>
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
