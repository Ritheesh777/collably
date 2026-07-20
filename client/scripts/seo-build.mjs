/**
 * Post-build SEO step.
 *
 * Two jobs, both aimed at crawlers that do NOT execute JavaScript — Facebook,
 * WhatsApp, Twitter/X, LinkedIn and most AI crawlers never run our React app,
 * so anything set at runtime is invisible to them:
 *
 *   1. sitemap.xml for the public routes.
 *   2. A real HTML file per public route with that page's title, description,
 *      canonical and OG tags baked into the markup. Each one still boots the
 *      same React bundle, so behaviour is unchanged for real visitors.
 *
 * Run automatically after `vite build`.
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://www.thecollably.in';
const DIST = path.resolve('dist');
const TODAY = new Date().toISOString().slice(0, 10);

/** Public, indexable routes. Everything behind a login is deliberately absent. */
const ROUTES = [
  {
    path: '/',
    priority: '1.0',
    changefreq: 'daily',
    title: 'Collably — Brand & Creator Collaboration Platform in India',
    description:
      'Collably connects brands with content creators and influencers across India. Post campaigns, discover verified creators, chat privately and collaborate — no agency fees, no middlemen.',
  },
  {
    path: '/how-it-works',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'How It Works — Brand & Creator Collaborations',
    description:
      'See how Collably works for brands and creators: post or browse campaigns, apply, chat privately, collaborate and review. Four simple steps to your next brand collaboration.',
  },
  {
    path: '/campaigns',
    priority: '0.9',
    changefreq: 'daily',
    title: 'Browse Influencer Campaigns & Brand Collaborations',
    description:
      'Browse live influencer marketing campaigns from brands across India. Filter by platform, category, follower range and city, then apply free as a content creator.',
  },
  {
    path: '/about',
    priority: '0.5',
    changefreq: 'monthly',
    title: 'About Collably — Creator Collaboration Platform',
    description:
      'Collably is built for small and mid-sized businesses and micro & mid-tier creators — structured discovery, real metrics and honest collaboration without agency fees.',
  },
  {
    path: '/register/company',
    priority: '0.7',
    changefreq: 'monthly',
    title: 'For Brands — Find Creators for Your Campaign',
    description:
      'Sign up free as a brand on Collably. Post a campaign, review real follower and engagement metrics, chat before you commit, and collaborate with the right creators.',
  },
  {
    path: '/register/creator',
    priority: '0.7',
    changefreq: 'monthly',
    title: 'For Creators — Get Paid Brand Collaborations',
    description:
      'Join Collably free as a content creator or influencer. Browse local and niche brand campaigns, showcase your media kit, apply in one tap and build a public reputation.',
  },
  {
    path: '/login',
    priority: '0.3',
    changefreq: 'yearly',
    title: 'Login',
    description: 'Log in to your Collably account to manage campaigns, applications and collaborations.',
  },
  {
    path: '/register',
    priority: '0.6',
    changefreq: 'monthly',
    title: 'Sign Up Free',
    description: 'Create a free Collably account as a brand or a content creator and start collaborating today.',
  },
  {
    path: '/terms',
    priority: '0.2',
    changefreq: 'yearly',
    title: 'Terms & Conditions',
    description: 'The terms that govern the use of the Collably platform.',
  },
  {
    path: '/privacy',
    priority: '0.2',
    changefreq: 'yearly',
    title: 'Privacy Policy',
    description: 'How Collably collects, uses and protects your personal information.',
  },
];

/* ── sitemap.xml ─────────────────────────────────────────────────────────── */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
  (r) => `  <url>
    <loc>${SITE}${r.path === '/' ? '/' : r.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);

/* ── per-route HTML with baked meta ──────────────────────────────────────── */
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let written = 0;
for (const r of ROUTES) {
  if (r.path === '/') continue; // dist/index.html is already the home page
  const url = `${SITE}${r.path}`;
  const title = `${r.title} | Collably`;

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${esc(r.description)}" />`
    )
    .replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${esc(title)}" />`
    )
    .replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${esc(r.description)}" />`
    );

  // canonical + og:url are absent from the template, so inject them
  html = html.replace(
    '</head>',
    `    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n  </head>`
  );

  const outDir = path.join(DIST, r.path.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  written++;
}

/* ── home page: canonical + og:url too ───────────────────────────────────── */
const home = template.replace(
  '</head>',
  `    <link rel="canonical" href="${SITE}/" />\n    <meta property="og:url" content="${SITE}/" />\n  </head>`
);
fs.writeFileSync(path.join(DIST, 'index.html'), home);

console.log(`  SEO: sitemap.xml (${ROUTES.length} urls) + ${written} pre-rendered route pages`);
