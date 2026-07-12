import { Link } from 'react-router-dom';
import { Avatar } from './ui.jsx';
import { daysLeft, formatDate } from '../utils/format.js';
import { PLATFORM_LABELS } from '../utils/constants.js';
import { categoryImage } from '../utils/images.js';
import { IconUsers, IconPin, IconArrowRight, IconBookmark, PLATFORM_ICON } from './icons.jsx';

export default function CampaignCard({ campaign, onToggleSave, to }) {
  const company = campaign.companyProfile || {};
  const dl = daysLeft(campaign.deadline);
  const link = to || `/campaigns/${campaign._id}`;

  return (
    <div className="card card-hover card-hover group flex h-full flex-col overflow-hidden">
      <div className="relative h-32 overflow-hidden bg-brand-gradient">
        <img
          src={campaign.bannerUrl || categoryImage(campaign.category)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 badge bg-white/90 text-ink-700 backdrop-blur">
          {campaign.category}
        </span>
        {onToggleSave && (
          <button
            onClick={() => onToggleSave(campaign)}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-500 backdrop-blur transition hover:text-accent-500"
            aria-label="Save campaign"
          >
            <IconBookmark className="h-4 w-4" fill={campaign.isSaved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <Avatar src={company.logoUrl} name={company.companyName} size={26} />
          <span className="truncate text-sm font-medium text-ink-600">{company.companyName || 'Company'}</span>
        </div>

        <Link to={link} className="line-clamp-2 font-semibold text-ink-900 transition-colors hover:text-brand-600">
          {campaign.title}
        </Link>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip"><IconUsers className="h-3.5 w-3.5" /> {campaign.followerRange}</span>
          {campaign.platforms?.slice(0, 2).map((p) => {
            const PIcon = PLATFORM_ICON[p] || PLATFORM_ICON.default;
            return (
              <span key={p} className="chip"><PIcon className="h-3.5 w-3.5" /> {PLATFORM_LABELS[p] || p}</span>
            );
          })}
          <span className="chip"><IconPin className="h-3.5 w-3.5" /> {campaign.isWorldwide ? 'Worldwide' : campaign.city || '—'}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-xs text-ink-400">
            {dl != null ? (dl >= 0 ? `${dl}d left` : 'Closed') : formatDate(campaign.deadline)}
          </span>
          <Link to={link} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            View <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
