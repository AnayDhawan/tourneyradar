import { describe, expect, it } from 'vitest';
import { generateBreadcrumbJsonLd } from './metadata';

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
