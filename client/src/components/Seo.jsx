import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-page SEO tags.
 *
 * This is a single-page app, so the server sends one index.html for every URL.
 * Without this, every page would share one title and description and Google
 * would effectively see a single page. Each route sets its own here.
 *
 * SITE_URL is the canonical origin. The app is reachable on the apex and on the
 * old *.vercel.app host too; pointing every canonical at one origin is what
 * stops Google treating those as duplicate copies and splitting the ranking.
 */
export const SITE_URL = 'https://www.thecollably.in';
export const SITE_NAME = 'Collably';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/** Creates or updates a <meta>/<link> in <head>, keyed by attribute. */
function setTag(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

export default function Seo({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
  keywords,
}) {
  const { pathname } = useLocation();
  // Trailing slash on the home URL so this matches sitemap.xml and the
  // pre-rendered HTML exactly — a canonical that disagrees with the sitemap is
  // a mixed signal to Google.
  const url = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
  // Keep titles under ~60 chars so Google doesn't truncate them in results.
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Where Brands & Creators Connect`;

  useEffect(() => {
    document.title = fullTitle;

    if (description) setTag('meta[name="description"]', { name: 'description', content: description });
    if (keywords) setTag('meta[name="keywords"]', { name: 'keywords', content: keywords });

    // Canonical — the single most important tag when one app answers on
    // several hostnames.
    setTag('link[rel="canonical"]', { rel: 'canonical', href: url });

    // Private, logged-in screens must never reach the index: they are useless
    // in search results and burn crawl budget that public pages need.
    setTag('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });

    setTag('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setTag('meta[property="og:url"]', { property: 'og:url', content: url });
    setTag('meta[property="og:type"]', { property: 'og:type', content: type });
    setTag('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    setTag('meta[property="og:image"]', { property: 'og:image', content: image });
    if (description)
      setTag('meta[property="og:description"]', { property: 'og:description', content: description });

    setTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setTag('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    if (description)
      setTag('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setTag('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  }, [fullTitle, description, url, image, type, noindex, keywords]);

  // Structured data gets its own tag per page, removed on unmount so pages
  // don't accumulate each other's schema.
  useEffect(() => {
    if (!jsonLd) return undefined;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo', 'page');
    el.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(el);
    return () => el.remove();
  }, [jsonLd]);

  return null;
}
