import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CampaignCard from '../../components/CampaignCard.jsx';
import { campaignApi, publicApi } from '../../api/endpoints.js';
import { compactNumber } from '../../utils/format.js';
import { HERO_IMAGES } from '../../utils/images.js';
import { FadeIn, Reveal, Stagger, StaggerItem, motion } from '../../lib/motion.jsx';
import {
  IconSparkles, IconSearch, IconMessage, IconHandshake, IconStar, IconShield,
  IconArrowRight, IconCheck, IconTrending, IconUser, IconCompany,
} from '../../components/icons.jsx';

const STEPS = [
  { icon: IconUser, title: 'Create an account', text: 'Sign up as a company or a creator in under a minute.' },
  { icon: IconSearch, title: 'Post or browse', text: 'Companies post campaigns; creators browse and apply.' },
  { icon: IconMessage, title: 'Chat & agree', text: 'Negotiate privately in a dedicated real-time chat.' },
  { icon: IconHandshake, title: 'Collaborate', text: 'Work together and review each other to build trust.' },
];

export default function Landing() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ companies: 0, creators: 0, campaigns: 0 });

  useEffect(() => {
    campaignApi.featured().then((d) => setFeatured(d?.items ?? [])).catch(() => {});
    publicApi.stats().then((d) => setStats(d?.stats ?? { companies: 0, creators: 0, campaigns: 0 })).catch(() => {});
  }, []);

  return (
    <div className="overflow-clip">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative border-b border-ink-200">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <FadeIn>
              <span className="badge border border-ink-200 bg-surface px-3 py-1 text-ink-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> No agency fees · No middlemen
              </span>
            </FadeIn>
            <FadeIn delay={0.06}>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 sm:text-6xl">
                Where brands meet the <span className="text-gradient">right creators</span>.
              </h1>
            </FadeIn>
            <FadeIn delay={0.12}>
              <p className="mx-auto mt-5 max-w-xl text-lg text-ink-600 lg:mx-0">
                InfluConnect is the marketplace where small businesses and content creators
                discover each other, chat, and collaborate — transparently.
              </p>
            </FadeIn>
            <FadeIn delay={0.18}>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/register/company" className="btn-primary px-5 py-3 text-base">
                  <IconCompany className="h-4 w-4" /> I'm a Company
                </Link>
                <Link to="/register/creator" className="btn-dark px-5 py-3 text-base">
                  <IconUser className="h-4 w-4" /> I'm a Creator
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.26}>
              <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12 lg:justify-start">
                {[
                  ['Companies', stats.companies],
                  ['Creators', stats.creators],
                  ['Live campaigns', stats.campaigns],
                ].map(([label, val]) => (
                  <div key={label} className="text-center lg:text-left">
                    <div className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
                      {compactNumber(val)}+
                    </div>
                    <div className="text-sm text-ink-500">{label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right: floating photo collage */}
          <FadeIn delay={0.2} className="relative hidden h-[420px] lg:block">
            <motion.img
              src={HERO_IMAGES.a}
              alt="Creator"
              loading="eager"
              className="absolute left-2 top-4 h-56 w-44 rounded-3xl object-cover shadow-lift ring-4 ring-white/60"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img
              src={HERO_IMAGES.b}
              alt="Creator"
              loading="eager"
              className="absolute right-4 top-0 h-44 w-36 rounded-3xl object-cover shadow-lift ring-4 ring-white/60"
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
            <motion.img
              src={HERO_IMAGES.c}
              alt="Creator"
              loading="eager"
              className="absolute bottom-2 right-10 h-52 w-64 rounded-3xl object-cover shadow-lift ring-4 ring-white/60"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            {/* floating glass stat chip */}
            <motion.div
              className="glass-strong absolute bottom-8 left-0 rounded-2xl px-4 py-3 shadow-lift"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white">
                  <IconHandshake className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-ink-900">Deal closed</div>
                  <div className="text-xs text-ink-500">in 48 hours</div>
                </div>
              </div>
            </motion.div>
          </FadeIn>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold text-ink-950 sm:text-4xl">How It Works</h2>
          <p className="mt-2 text-ink-500">Four simple steps to your next collaboration.</p>
        </Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <StaggerItem key={s.title} className="card card-hover group relative p-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lift transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                <s.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-600">Step {i + 1}</div>
              <h3 className="mt-1 text-lg font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{s.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-10 text-center">
          <Link to="/how-it-works" className="btn-outline">
            See the full flow <IconArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      {/* ── Two paths ─────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">
          <Reveal>
            <PathCard
              tone="brand"
              Icon={IconCompany}
              title="For Companies"
              points={['Post campaigns in minutes', 'Review real creator metrics', 'Chat before you commit', 'Rate creators after collaborating']}
              cta={['Post a Campaign', '/register/company']}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <PathCard
              tone="dark"
              Icon={IconUser}
              title="For Creators"
              points={['Browse local & niche campaigns', 'Showcase your media kit', 'Apply with one tap', 'Build a public reputation']}
              cta={['Find Campaigns', '/register/creator']}
            />
          </Reveal>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Stagger className="grid gap-5 sm:grid-cols-3">
          {[
            [IconShield, 'Verified & moderated', 'Admin verification and a complaint system keep bad actors out.'],
            [IconStar, 'Reputation that follows you', 'Mutual reviews build trust for both sides over time.'],
            [IconTrending, 'Built to scale', 'Structured search replaces endless DMs and cold outreach.'],
          ].map(([Icon, t, d]) => (
            <StaggerItem key={t} className="card card-hover group p-6">
              <Icon className="h-6 w-6 text-brand-600 transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
              <h3 className="mt-3 font-semibold text-ink-900">{t}</h3>
              <p className="mt-1 text-sm text-ink-500">{d}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── Featured campaigns ────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-ink-950 sm:text-4xl">Live Campaigns</h2>
              <p className="mt-1 text-ink-500">A peek at opportunities happening right now.</p>
            </div>
            <Link to="/campaigns" className="hidden text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex sm:items-center sm:gap-1">
              View all <IconArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <StaggerItem key={c._id}>
                <CampaignCard campaign={c} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="px-4 py-16">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-ink-950 px-6 py-16 text-center text-white">
          <div className="pointer-events-none absolute inset-0 bg-mesh opacity-40" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to start collaborating?</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-300">
              Join InfluConnect free today. Payments stay private between you and your partner.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary px-5 py-3 text-base">Get Started Free</Link>
              <Link to="/how-it-works" className="btn px-5 py-3 text-base text-white ring-1 ring-white/25 hover:bg-white/10">
                Learn More
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function PathCard({ tone, Icon, title, points, cta }) {
  const header =
    tone === 'brand' ? 'bg-brand-gradient' : 'bg-ink-950';
  return (
    <div className="card card-hover card-hover group h-full overflow-hidden">
      <div className={`relative ${header} overflow-hidden p-6 text-white`}>
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-30" />
        <Icon className="relative h-8 w-8" strokeWidth={1.75} />
        <h3 className="relative mt-3 text-2xl font-bold text-white">{title}</h3>
      </div>
      <div className="p-6">
        <ul className="space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <IconCheck className="h-3 w-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <Link to={cta[1]} className="btn-primary mt-6 w-full">
          {cta[0]} <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
