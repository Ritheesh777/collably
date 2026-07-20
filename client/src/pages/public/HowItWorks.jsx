import { Link } from 'react-router-dom';
import { Reveal } from '../../lib/motion.jsx';
import { IconCompany, IconUser } from '../../components/icons.jsx';
import Seo from '../../components/Seo.jsx';

const COMPANY = [
  ['Register', 'Create your company account and set up your brand profile.'],
  ['Post a Campaign', 'Describe the collaboration, requirements, follower range and deadline.'],
  ['Review Creators', 'See who applied, with their real metrics and portfolio.'],
  ['Chat', 'Negotiate privately in a dedicated real-time chat.'],
  ['Collaborate & Review', 'Work together, then leave a review to build trust.'],
];

const CREATOR = [
  ['Register', 'Create your creator account with your name and username.'],
  ['Add Socials', 'Link your platforms and showcase your reach and engagement.'],
  ['Browse', 'Filter campaigns by category, location, platform and follower range.'],
  ['Apply', 'Send an application with a message and your best work.'],
  ['Chat & Collaborate', 'Once you apply, chat unlocks so you can close the deal.'],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <Seo
        title="How It Works — Brand & Creator Collaborations"
        description="See how Collably works for brands and creators: post or browse campaigns, apply, chat privately, collaborate and review. Four simple steps to your next brand collaboration."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'How do brands find creators on Collably?', acceptedAnswer: { '@type': 'Answer', text: 'Brands post a campaign with their requirements — platform, follower range, category and city. Matching creators browse and apply, and brands review real metrics before accepting.' } },
            { '@type': 'Question', name: 'Is Collably free for creators?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Creators join free and get three free collaborations. After that a subscription keeps collaborations unlimited.' } },
            { '@type': 'Question', name: 'Does Collably take a commission on brand deals?', acceptedAnswer: { '@type': 'Answer', text: 'No. Payments between a brand and a creator are arranged privately between them. Collably charges only a platform subscription and never takes a cut of your deal.' } },
            { '@type': 'Question', name: 'When do contact details become visible?', acceptedAnswer: { '@type': 'Answer', text: 'Contact details stay private until both sides accept a collaboration. Chat and contact information unlock only after mutual acceptance.' } },
          ],
        }}
      />
      <Reveal className="text-center">
        <h1 className="text-4xl font-bold text-ink-950">How Collably Works</h1>
        <p className="mt-3 text-ink-500">
          Two sides, one transparent workflow. No payments handled on-platform — you settle privately.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <Flow title="For Companies" Icon={IconCompany} tone="brand" steps={COMPANY} cta={['Register as Company', '/register/company']} />
        <Flow title="For Creators" Icon={IconUser} tone="accent" steps={CREATOR} cta={['Register as Creator', '/register/creator']} />
      </div>
    </div>
  );
}

function Flow({ title, Icon, tone, steps, cta }) {
  const dot = tone === 'brand' ? 'bg-brand-gradient' : 'bg-ink-950';
  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${dot} text-white`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        {title}
      </h2>
      <ol className="mt-6 space-y-6">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-4">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${dot} text-sm font-bold text-white`}>
              {i + 1}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t}</h3>
              <p className="text-sm text-slate-500">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to={cta[1]} className="btn-primary mt-8 w-full">
        {cta[0]}
      </Link>
    </div>
  );
}
