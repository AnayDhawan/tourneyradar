import { describe, expect, it } from 'vitest';
import { generateBreadcrumbJsonLd, serializeJsonLd } from './metadata';

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
