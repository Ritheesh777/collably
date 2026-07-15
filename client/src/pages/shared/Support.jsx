import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supportApi } from '../../api/endpoints.js';
import { PageLoader, Spinner, StatusBadge } from '../../components/ui.jsx';
import { formatDate } from '../../utils/format.js';
import {
  IconSupport, IconMail, IconPhone, IconClock, IconChevronDown, IconSend, IconTicket,
} from '../../components/icons.jsx';

/**
 * Help & Support (v2 §33).
 * Support contact, helpline, FAQ, and problem reporting in one place.
 */
const CATEGORIES = [
  { value: 'technical', label: 'Technical issue' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'payment', label: 'Payment' },
  { value: 'account', label: 'My account' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'other', label: 'Something else' },
];

export default function Support() {
  const [info, setInfo] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ category: 'technical', subject: '', message: '' });

  const load = () =>
    Promise.all([supportApi.info(), supportApi.tickets()])
      .then(([i, t]) => {
        setInfo(i.support);
        setTickets(t.items || []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (form.subject.trim().length < 3) return toast.error('Please add a short subject.');
    if (form.message.trim().length < 10)
      return toast.error('Please describe the problem in a little more detail.');
    setSending(true);
    try {
      await supportApi.createTicket(form);
      toast.success('Thanks — our team will get back to you.');
      setForm({ category: 'technical', subject: '', message: '' });
      const t = await supportApi.tickets();
      setTickets(t.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Help &amp; Support</h1>
        <p className="text-ink-500">Find an answer, or tell us what went wrong.</p>
      </div>

      {/* Contact (§33) */}
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Contact icon={IconMail} label="Email us" value={info?.email} href={`mailto:${info?.email}`} />
          {info?.helpline ? (
            <Contact
              icon={IconPhone}
              label="Helpline"
              value={info.helpline}
              href={`tel:${info.helpline.replace(/\s/g, '')}`}
            />
          ) : (
            <Contact icon={IconClock} label="Support hours" value={info?.hours} />
          )}
          <Contact icon={IconSupport} label="Typical reply" value={info?.responseTime} />
        </div>
      </div>

      {/* FAQ (§33) */}
      {info?.faqs?.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-1 text-lg font-semibold text-ink-950">Frequently asked</h2>
          <div className="divide-y divide-ink-100">
            {info.faqs.map((f, i) => (
              <Faq key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      )}

      {/* Report a problem (§33) */}
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">Report a problem</h2>
          <p className="text-sm text-ink-500">
            The more detail you give, the faster we can fix it.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="s-cat">What is this about?</label>
          <select
            id="s-cat"
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="s-subj">Subject</label>
          <input
            id="s-subj"
            className="input"
            placeholder="Short summary of the issue"
            maxLength={150}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="s-msg">What happened?</label>
          <textarea
            id="s-msg"
            className="input min-h-[120px]"
            placeholder="Tell us what you did, what you expected, and what happened instead."
            maxLength={4000}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <p className="mt-1 text-xs text-ink-400">{form.message.length}/4000</p>
        </div>

        <button className="btn-primary" disabled={sending}>
          {sending ? <Spinner className="h-4 w-4" /> : <IconSend className="h-4 w-4" />}
          {sending ? 'Sending…' : 'Send to support'}
        </button>
      </form>

      {/* History */}
      {tickets.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink-950">
            <IconTicket className="h-4 w-4 text-ink-400" /> Your requests
          </h2>
          <ul className="divide-y divide-ink-100">
            {tickets.map((t) => (
              <li key={t._id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-900">{t.subject}</div>
                    <div className="text-xs text-ink-400">
                      {formatDate(t.createdAt)} · {t.category}
                    </div>
                  </div>
                  <StatusBadge status={t.status === 'resolved' ? 'accepted' : t.status === 'open' ? 'pending' : t.status} />
                </div>
                {t.adminResponse && (
                  <div className="mt-2 rounded-lg border-l-2 border-brand-400 bg-ink-50 px-3 py-2">
                    <div className="text-xs font-semibold text-ink-500">Support replied</div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">{t.adminResponse}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Contact({ icon: Icon, label, value, href }) {
  if (!value) return null;
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-0.5 break-words font-medium text-ink-900">{value}</div>
    </>
  );
  return href ? (
    <a href={href} className="rounded-lg p-2 -m-2 transition hover:bg-ink-50">{inner}</a>
  ) : (
    <div>{inner}</div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-ink-900">{q}</span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{a}</p>}
    </div>
  );
}
