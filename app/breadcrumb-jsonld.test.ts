import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Both page modules pull in client components and Supabase. Only the structured data they
// emit is under test, so those are stubbed.
vi.mock('../components/BaseLayout', () => ({ default: () => null }));
vi.mock('./tournaments/[id]/TournamentDetailClient', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const tournament = {
  id: 'cr_1',
  name: 'Mumbai Open',
  date: '2027-03-14',
  end_date: '2027-03-16',
  city: 'Mumbai',
  state: null,
  country: 'India',
  country_code: 'IN',
  category: 'Rapid',
  fide_rated: true,
  status: 'published',
  lat: 19.07,
  lng: 72.87,
  source_url: null,
  location: null,
  external_link: null,
  organizer_name: null,
  created_at: '2026-10-01T00:00:00Z',
};

// A PostgREST query stand-in: every builder method returns the same thenable, which resolves
// to the rows (or the single row) for the page under test.
vi.mock('@/lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  const result = { data: [tournament], error: null, count: 1 };
  for (const method of ['select', 'eq', 'gte', 'order', 'limit']) builder[method] = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: tournament, error: null });
  builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);
  return { supabase: { from: () => builder } };
});

type Node = ReactNode | ReactElement<{ children?: ReactNode; type?: string; dangerouslySetInnerHTML?: { __html: string } }>;

function jsonLdScripts(node: Node, found: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    node.forEach((child) => jsonLdScripts(child, found));
  } else if (node && typeof node === 'object' && 'props' in node) {
    const { type, children, dangerouslySetInnerHTML } = node.props;
    if (node.type === 'script' && type === 'application/ld+json' && dangerouslySetInnerHTML) {
      found.push(JSON.parse(dangerouslySetInnerHTML.__html));
    }
    jsonLdScripts(children, found);
  }
  return found;
}

function breadcrumb(scripts: unknown[]) {
  return scripts.find((s) => (s as { '@type'?: string })['@type'] === 'BreadcrumbList') as
    | { '@context': string; itemListElement: { '@type': string; position: number; name: string; item: string }[] }
    | undefined;
}

describe('BreadcrumbList JSON-LD on public pages', () => {
  it('the country page emits a valid BreadcrumbList with the canonical lower-case URL', async () => {
    const { default: CountryPage } = await import('./country/[code]/page');

    for (const code of ['in', 'IN']) {
      const tree = await CountryPage({ params: Promise.resolve({ code }) });
      const list = breadcrumb(jsonLdScripts(tree));

      expect(list, code).toBeDefined();
      expect(list!['@context']).toBe('https://schema.org');
      expect(list!.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(list!.itemListElement.every((i) => i['@type'] === 'ListItem')).toBe(true);
      expect(list!.itemListElement.map((i) => i.name)).toEqual(['Home', 'Countries', 'India']);
      expect(list!.itemListElement[2].item).toBe('https://www.tourneyradar.com/country/in');
    }
  });

  it('the tournament page emits a valid BreadcrumbList ending at the tournament', async () => {
    const { default: TournamentPage } = await import('./tournaments/[id]/page');

    const tree = await TournamentPage({ params: Promise.resolve({ id: 'cr_1' }) });
    const list = breadcrumb(jsonLdScripts(tree));

    expect(list).toBeDefined();
    expect(list!.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(list!.itemListElement.map((i) => i.name)).toEqual(['Home', 'Tournaments', 'Mumbai Open']);
    expect(list!.itemListElement[2].item).toBe('https://www.tourneyradar.com/tournaments/cr_1');
    for (const entry of list!.itemListElement) expect(() => new URL(entry.item)).not.toThrow();
  });
});
