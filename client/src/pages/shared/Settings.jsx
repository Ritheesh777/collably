import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, notificationApi } from '../../api/endpoints.js';
import { Field } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DeleteAccount from '../../components/DeleteAccount.jsx';

export default function Settings() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  // Clear the session AND send them straight to the login page.
  const doLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [prefs, setPrefs] = useState(user?.notificationPrefs || { email: true, browser: true });
  const [busy, setBusy] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('New passwords do not match');
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const savePrefs = async (next) => {
    setPrefs(next);
    try {
      await notificationApi.preferences(next);
      refresh();
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="card p-6">
        <h2 className="font-semibold text-ink-950">Change Password</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-4">
          <Field label="Current Password">
            <input type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New Password">
              <input type="password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} />
            </Field>
            <Field label="Confirm New Password">
              <input type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </Field>
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-ink-950">Notification Preferences</h2>
        <div className="mt-4 space-y-3">
          <Toggle label="Email notifications" checked={prefs.email} onChange={(v) => savePrefs({ ...prefs, email: v })} />
          <Toggle label="Browser notifications" checked={prefs.browser} onChange={(v) => savePrefs({ ...prefs, browser: v })} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-ink-950">Sign out</h2>
        <p className="mt-1 text-sm text-ink-500">Log out of your account on this device.</p>
        <button onClick={doLogout} className="btn-outline mt-4">Logout</button>
      </div>

      {/* §34 — staged deletion with password re-authentication */}
      <DeleteAccount />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm text-ink-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-ink-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
