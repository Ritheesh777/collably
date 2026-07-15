import { useState } from 'react';
import toast from 'react-hot-toast';
import { supportApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';
import { IconWarning, IconTrash, IconX } from './icons.jsx';

/**
 * Account deletion (v2 §34).
 *
 * The spec mandates a deliberate, staged flow:
 *   Delete Account → Warning → Confirmation → Password → Final confirmation
 * Each step is a separate decision, so nobody deletes an account by reflex.
 */
export default function DeleteAccount() {
  const { logout } = useAuth();
  const [step, setStep] = useState(0); // 0 closed · 1 warning · 2 password · 3 final
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStep(0);
    setPassword('');
    setConfirm('');
  };

  const doDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await supportApi.deleteAccount(password, confirm);
      toast.success('Your account has been deleted.');
      logout();
      window.location.href = '/';
    } catch (e) {
      // The server refuses while collaborations are still active — surface that
      // reason verbatim rather than a generic failure.
      toast.error(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="card border-rose-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink-950">Delete account</h2>
          <p className="mt-0.5 max-w-lg text-sm text-ink-500">
            Permanently close your account. Your collaboration and payment records are kept in
            anonymised form, because they are the other party's records too.
          </p>
        </div>
        <button className="btn-outline border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => setStep(1)}>
          <IconTrash className="h-4 w-4" /> Delete account
        </button>
      </div>

      {step > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={close} />
          <div className="card relative z-10 w-full max-w-md p-6">
            <button
              onClick={close}
              className="absolute right-4 top-4 text-ink-400 hover:text-ink-700"
              aria-label="Close"
            >
              <IconX className="h-5 w-5" />
            </button>

            {step === 1 && (
              <>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <IconWarning className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink-950">
                  Delete your account?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">This will:</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
                  <li className="flex gap-2"><Dot /> Sign you out and stop you logging in again</li>
                  <li className="flex gap-2"><Dot /> Remove your profile, photos and contact details</li>
                  <li className="flex gap-2"><Dot /> Close your campaigns and withdraw pending applications</li>
                  <li className="flex gap-2"><Dot /> End any active subscription without a refund</li>
                </ul>
                <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-500">
                  Kept for audit, in anonymised form: past collaborations, reviews you gave and
                  received, and subscription payment records. We cannot delete these — they belong
                  to the people you worked with as much as to you.
                </p>
                <div className="mt-5 flex gap-2">
                  <button className="btn-ghost flex-1" onClick={close}>Keep my account</button>
                  <button
                    className="btn-outline flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="font-display text-xl font-semibold text-ink-950">Confirm it's you</h3>
                <p className="mt-1 text-sm text-ink-500">
                  Enter your password to prove this is really you.
                </p>
                <label className="label mt-4" htmlFor="del-pw">Password</label>
                <input
                  id="del-pw"
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="mt-5 flex gap-2">
                  <button className="btn-ghost flex-1" onClick={close}>Cancel</button>
                  <button
                    className="btn-outline flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                    disabled={!password}
                    onClick={() => setStep(3)}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h3 className="font-display text-xl font-semibold text-ink-950">Last step</h3>
                <p className="mt-1 text-sm text-ink-500">
                  Type <span className="font-mono font-semibold text-ink-800">DELETE</span> to
                  confirm. This cannot be undone.
                </p>
                <input
                  className="input mt-4 font-mono"
                  placeholder="DELETE"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value.toUpperCase())}
                />
                <div className="mt-5 flex gap-2">
                  <button className="btn-ghost flex-1" onClick={close} disabled={busy}>Cancel</button>
                  <button
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                    disabled={confirm !== 'DELETE' || busy}
                    onClick={doDelete}
                  >
                    {busy ? <Spinner className="mx-auto h-4 w-4" /> : 'Delete my account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Dot = () => <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />;
