import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/endpoints.js';
import { PageLoader, EmptyState, StatusBadge, Avatar } from '../../components/ui.jsx';
import { formatDate } from '../../utils/format.js';
import { IconTicket, IconSend } from '../../components/icons.jsx';

/** Support inbox (v2 §33) — the other end of the user's "Report a problem" form. */
const FILTERS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];

export default function AdminTickets() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');

  const load = (status = filter) => {
    setLoading(true);
    adminApi
      .tickets(status ? { status } : {})
      .then((d) => {
        setItems(d.items);
        setCounts(d.counts || {});
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const send = async (t, status) => {
    try {
      await adminApi.respondTicket(t._id, { adminResponse: reply || undefined, status });
      toast.success('Reply sent');
      setReplying(null);
      setReply('');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Support inbox</h1>
        <p className="text-ink-500">Problems reported by companies and creators.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.key ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {f.label}
            {counts[f.key] > 0 && <span className="ml-1 text-ink-400">{counts[f.key]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={IconTicket} title="Nothing here" subtitle="No tickets match this filter." />
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <Avatar name={t.user?.name} size={36} />
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-950">{t.subject}</div>
                    <div className="text-xs text-ink-400">
                      {/* §32 — admins can jump straight to the reporter's profile */}
                      <Link
                        to={t.user?.role === 'creator' ? `/admin/creator/${t.user._id}` : `/admin/company/${t.user?._id}`}
                        className="font-medium text-ink-600 hover:underline"
                      >
                        {t.user?.name || 'Unknown'}
                      </Link>{' '}
                      · {t.user?.role} · {formatDate(t.createdAt)} · {t.category}
                    </div>
                  </div>
                </div>
                <StatusBadge
                  status={t.status === 'resolved' ? 'accepted' : t.status === 'open' ? 'pending' : t.status}
                />
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">
                {t.message}
              </p>

              {t.adminResponse && (
                <div className="mt-2 rounded-lg border-l-2 border-brand-400 bg-brand-50/40 px-3 py-2">
                  <div className="text-xs font-semibold text-ink-500">
                    Replied {t.respondedAt ? formatDate(t.respondedAt) : ''}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">{t.adminResponse}</p>
                </div>
              )}

              {replying === t._id ? (
                <div className="mt-3">
                  <textarea
                    className="input min-h-[90px]"
                    placeholder="Write a reply to this person…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-primary text-xs" onClick={() => send(t, 'resolved')}>
                      <IconSend className="h-3.5 w-3.5" /> Reply &amp; resolve
                    </button>
                    <button className="btn-outline text-xs" onClick={() => send(t, 'in_progress')}>
                      Reply &amp; keep open
                    </button>
                    <button className="btn-ghost text-xs" onClick={() => { setReplying(null); setReply(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-outline text-xs"
                    onClick={() => { setReplying(t._id); setReply(t.adminResponse || ''); }}
                  >
                    {t.adminResponse ? 'Edit reply' : 'Reply'}
                  </button>
                  {t.status !== 'resolved' && (
                    <button className="btn-ghost text-xs" onClick={() => send(t, 'resolved')}>
                      Mark resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
