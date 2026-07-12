import { Link } from 'react-router-dom';
import Logo, { LogoMark } from './Logo.jsx';
import { FadeIn } from '../lib/motion.jsx';
import { IconArrowLeft, IconCheck } from './icons.jsx';

const IMG = (id, w = 900) =>
  `https://images.unsplash.com/${id}?w=${w}&q=75&auto=format&fit=crop`;

export default function AuthShell({ title, subtitle, children, side = 'creator' }) {
  const panels = {
    creator: {
      image: IMG('photo-1524504388940-b1c1722653e1'),
      quote: 'InfluConnect got me four brand deals in my first month.',
      who: 'Ananya — Lifestyle Creator',
      points: ['Browse local & niche campaigns', 'Showcase your media kit', 'Build a public reputation'],
    },
    company: {
      image: IMG('photo-1519085360753-af0119f7cbe7'),
      quote: 'We filled a three-creator campaign in 48 hours.',
      who: 'Aura Fashion Co.',
      points: ['Post campaigns in minutes', 'Review real creator metrics', 'Chat before you commit'],
    },
    admin: {
      image: IMG('photo-1451187580459-43490279c0fa'),
      quote: 'Full oversight of the marketplace in one place.',
      who: 'Platform Administration',
      points: ['Verify & moderate users', 'Handle reports fast', 'Keep the marketplace clean'],
    },
  };
  const p = panels[side] || panels.creator;

  return (
    <div className="flex min-h-screen">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2">
        <FadeIn className="mx-auto w-full max-w-md">
          <div className="glass-strong rounded-3xl p-7 shadow-lift sm:p-9">
            <Logo />
            <h1 className="mt-8 text-2xl font-bold text-ink-950">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </FadeIn>
      </div>

      {/* Right: photographic brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-ink-900 lg:block">
        <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 grayscale" />
        <div className="absolute inset-0 bg-ink-900/60" />
        <div className="absolute right-8 top-8">
          <LogoMark size={40} />
        </div>
        <div className="relative flex h-full flex-col justify-end p-12 text-paper">
          <div className="mb-5 h-px w-12 bg-brand-500" />
          <p className="max-w-md font-display text-3xl font-medium leading-snug text-paper">"{p.quote}"</p>
          <p className="mt-4 text-sm text-paper/70">{p.who}</p>
          <ul className="mt-8 space-y-2.5">
            {p.points.map((pt) => (
              <li key={pt} className="flex items-center gap-2.5 text-sm text-paper/90">
                <IconCheck className="h-4 w-4 text-brand-400" strokeWidth={3} />
                {pt}
              </li>
            ))}
          </ul>
          <Link to="/" className="mt-10 inline-flex items-center gap-1.5 text-sm text-paper/70 hover:text-paper">
            <IconArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
