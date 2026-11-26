import { describe, expect, it, vi } from 'vitest';
import type { Metadata } from 'next';

// The server pages below import the Supabase client and client components, which
// need env vars and a browser build. Only their exported metadata matters here.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/tournaments', () => ({ queryTournaments: vi.fn() }));
vi.mock('./tournaments/TournamentsClient', () => ({ default: () => null }));
vi.mock('./updates/UpdatesPageClient', () => ({ default: () => null }));
vi.mock('./docs/DocsPageClient', () => ({ default: () => null }));

// Client pages cannot export metadata, so each has a layout.tsx that does. Without
// one the page inherits the root layout's canonical, which points at the homepage.
const layouts: [string, () => Promise<{ metadata: Metadata }>][] = [
  ['/about', () => import('./about/layout')],
  ['/contact', () => import('./contact/layout')],
  ['/feedback', () => import('./feedback/layout')],
  ['/support', () => import('./support/layout')],
  ['/legal', () => import('./legal/layout')],
  ['/legal/privacy', () => import('./legal/privacy/layout')],
  ['/legal/terms', () => import('./legal/terms/layout')],
  ['/tournaments', () => import('./tournaments/page')],
  ['/updates', () => import('./updates/page')],
  ['/docs', () => import('./docs/page')],
];

describe('client page canonical URLs', () => {
  it.each(layouts)('%s has its own canonical URL', async (path, load) => {
    const { metadata } = await load();
    expect(metadata.alternates?.canonical).toBe(`https://www.tourneyradar.com${path}`);
    expect(metadata.openGraph).toMatchObject({ url: `https://www.tourneyradar.com${path}` });
  });
});

// The root layout's Open Graph block is the homepage's. A page that does not set its
// own title and description would be shared as "TourneyRadar | Find Chess Tournaments
// Worldwide", so check the text too, and that the site name is not doubled.
const pages = layouts.filter(([path]) => ['/tournaments', '/updates', '/docs'].includes(path));

describe('listing page Open Graph text', () => {
  it.each(pages)('%s has its own Open Graph and Twitter title and description', async (_path, load) => {
    const { metadata } = await load();
    const title = String(metadata.title);
    expect(title).not.toContain('TourneyRadar');
    expect(title).not.toBe('TourneyRadar | Find Chess Tournaments Worldwide');
    expect(metadata.openGraph).toMatchObject({
      title: `${title} | TourneyRadar`,
      description: metadata.description,
    });
    expect(metadata.twitter).toMatchObject({
      title: `${title} | TourneyRadar`,
      description: metadata.description,
    });
  });
});
