import { describe, expect, it } from 'vitest';
import type { Metadata } from 'next';

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
];

describe('client page canonical URLs', () => {
  it.each(layouts)('%s has its own canonical URL', async (path, load) => {
    const { metadata } = await load();
    expect(metadata.alternates?.canonical).toBe(`https://www.tourneyradar.com${path}`);
    expect(metadata.openGraph).toMatchObject({ url: `https://www.tourneyradar.com${path}` });
  });
});
