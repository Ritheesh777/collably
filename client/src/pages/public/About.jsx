import { useState } from 'react';
import toast from 'react-hot-toast';
import { publicApi } from '../../api/endpoints.js';
import { Field } from '../../components/ui.jsx';
import { IconSearch, IconMessage, IconStar } from '../../components/icons.jsx';
import Seo from '../../components/Seo.jsx';

export default function About() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { message } = await publicApi.contact(form);
      toast.success(message);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <Seo title="About Collably" description="Collably is built for small and mid-sized businesses and micro & mid-tier creators — structured discovery, real metrics and honest collaboration without agency fees." />
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">About Collably</h1>
          <p className="mt-4 text-slate-600">
            Collably is a marketplace built for small-to-mid-sized businesses and micro/mid-tier
            content creators — a segment underserved by enterprise influencer platforms.
          </p>
          <p className="mt-4 text-slate-600">
            We replace scattered DMs and cold outreach with structured discovery, verified metrics, a
            dedicated chat, and a mutual review system that builds real reputation over time.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              [IconSearch, 'Discover', 'Structured search & filters'],
              [IconMessage, 'Communicate', 'Private real-time chat'],
              [IconStar, 'Trust', 'Reviews & moderation'],
            ].map(([Ico, t, d]) => (
              <div key={t} className="card p-4 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Ico className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="mt-2 text-sm font-semibold text-ink-900">{t}</div>
                <div className="text-xs text-ink-500">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold text-slate-800">Contact Us</h2>
          <p className="mt-1 text-sm text-slate-500">Have a question? We'd love to hear from you.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Name" required>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Message" required>
              <textarea
                className="input min-h-[120px]"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </Field>
            <button className="btn-primary w-full" disabled={sending}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
