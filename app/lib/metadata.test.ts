import { describe, expect, it } from 'vitest';
import {
  generateBreadcrumbJsonLd,
  generateCityMetadata,
  generateCountryMetadata,
  generateTournamentMetadata,
  serializeJsonLd,
} from './metadata';

describe('generateBreadcrumbJsonLd', () => {
  const items = [
    { name: 'Home', url: 'https://www.tourneyradar.com' },
    { name: 'Countries', url: 'https://www.tourneyradar.com/tournaments' },
    { name: 'India', url: 'https://www.tourneyradar.com/country/in' },
  ];

  it('is a schema.org BreadcrumbList', () => {
    const node = generateBreadcrumbJsonLd(items);
    expect(node['@context']).toBe('https://schema.org');
    expect(node['@type']).toBe('BreadcrumbList');
  });

  it('lists every crumb in order, numbered from 1, with its name and URL', () => {
    const node = generateBreadcrumbJsonLd(items);
    expect(node.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tourneyradar.com' },
      { '@type': 'ListItem', position: 2, name: 'Countries', item: 'https://www.tourneyradar.com/tournaments' },
      { '@type': 'ListItem', position: 3, name: 'India', item: 'https://www.tourneyradar.com/country/in' },
    ]);
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(generateBreadcrumbJsonLd(items)))).not.toThrow();
  });
});

describe('serializeJsonLd', () => {
  const hostile = '</script><script>alert(document.cookie)</script><!--';

  it('never emits a "<", so a scraped name cannot close the script tag', () => {
    const out = serializeJsonLd(generateBreadcrumbJsonLd([{ name: hostile, url: 'https://www.tourneyradar.com' }]));
    expect(out).not.toContain('<');
    expect(out.toLowerCase()).not.toContain('</script');
  });

  it('round-trips: parsing the output gives back the original node', () => {
    const node = generateBreadcrumbJsonLd([{ name: hostile, url: 'https://www.tourneyradar.com' }]);
    expect(JSON.parse(serializeJsonLd(node))).toEqual(node);
  });

  it('escapes the JS line separators U+2028 and U+2029', () => {
    const out = serializeJsonLd({ name: 'a\u2028b\u2029c' });
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual({ name: 'a\u2028b\u2029c' });
  });

  it('leaves ordinary data unchanged', () => {
    const node = { '@type': 'Event', name: 'Spring Open 2026', url: 'https://www.tourneyradar.com/tournaments/cr_1' };
    expect(serializeJsonLd(node)).toBe(JSON.stringify(node));
  });
});

// The root layout sets `title.template` to "%s | TourneyRadar". Applying it by
// hand shows what a visitor actually gets in the <title>.
const TEMPLATE = '%s | TourneyRadar';
const rendered = (title: unknown) => TEMPLATE.replace('%s', String(title));
const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

describe('generateTournamentMetadata', () => {
  const tournament = {
    id: 'cr_1521150',
    name: 'Mumbai Open',
    date: '2026-12-26',
    city: 'Mumbai',
    country: 'India',
    country_code: 'IN',
    category: 'Classical',
    fide_rated: true,
  };

  it('has its own canonical URL, not the homepage', () => {
    const meta = generateTournamentMetadata(tournament);
    expect(meta.alternates?.canonical).toBe('https://www.tourneyradar.com/tournaments/cr_1521150');
  });

  it('sets a large social card with an image', () => {
    const meta = generateTournamentMetadata(tournament);
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(meta.openGraph).toMatchObject({
      images: [expect.objectContaining({ url: 'https://www.tourneyradar.com/og-image.png' })],
    });
    expect(meta.twitter && 'images' in meta.twitter && meta.twitter.images).toEqual([
      'https://www.tourneyradar.com/og-image.png',
    ]);
  });

  it('shows the site name once in the rendered page title', () => {
    const title = rendered(generateTournamentMetadata(tournament).title);
    expect(title).toBe('Mumbai Open - Mumbai, IN | TourneyRadar');
    expect(occurrences(title, 'TourneyRadar')).toBe(1);
  });

  it('keeps the site name in the Open Graph and Twitter titles', () => {
    const meta = generateTournamentMetadata(tournament);
    expect(meta.openGraph?.title).toBe('Mumbai Open - Mumbai, IN | TourneyRadar');
    expect(meta.twitter?.title).toBe('Mumbai Open - Mumbai, IN | TourneyRadar');
  });

  it('never writes "null" or "undefined" for a missing category, city or country', () => {
    const meta = generateTournamentMetadata({
      id: 'x1',
      name: 'Pop-up Blitz',
      date: '2026-12-26',
      category: null as unknown as undefined,
      city: null as unknown as undefined,
      country: undefined,
      country_code: undefined,
    });
    const text = [rendered(meta.title), meta.description, ...(meta.keywords as string[])].join(' | ');
    expect(text).not.toMatch(/null|undefined/);
    expect(rendered(meta.title)).toBe('Pop-up Blitz | TourneyRadar');
    expect(meta.description).toContain('Chess tournament on December 26, 2026.');
  });

  it('formats a date-only value as that day, whatever the server timezone', () => {
    expect(generateTournamentMetadata(tournament).description).toContain('December 26, 2026');
  });
});

describe('country and city metadata', () => {
  it('shows the site name once in the rendered country title', () => {
    const meta = generateCountryMetadata('IN', 'India', 40);
    const title = rendered(meta.title);
    expect(title).toBe('Chess Tournaments in India | TourneyRadar');
    expect(occurrences(title, 'TourneyRadar')).toBe(1);
    expect(meta.openGraph?.title).toBe('Chess Tournaments in India | TourneyRadar');
  });

  it('shows the site name once in the rendered city title', () => {
    const title = rendered(generateCityMetadata('Pune', 'India', 5).title);
    expect(title).toBe('Chess Tournaments in Pune, India | TourneyRadar');
    expect(occurrences(title, 'TourneyRadar')).toBe(1);
  });
});
