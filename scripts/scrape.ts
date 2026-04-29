import puppeteer, { Browser } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { countryNameToCode } from '../lib/countryMap';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('   Run with: npm run scrape');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ScrapedTournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  country_code: string;
  time_control: string;
  rounds: number | null;
  organizer: string | null;
  source_url: string;
  external_link: string | null;
  lat: number | null;
  lng: number | null;
}

// ========== GEOCODING ==========
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng
      };
    }
  } catch {}
  return null;
}

// ========== DATE PARSING ==========
function parseDate(str: string): { start: string; end: string } | null {
  if (!str) return null;
  const range = str.match(/(\d{4}\/\d{2}\/\d{2})\s*to\s*(\d{4}\/\d{2}\/\d{2})/);
  if (range) return { start: range[1].replace(/\//g, '-'), end: range[2].replace(/\//g, '-') };
  const single = str.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (single) { const d = single[1].replace(/\//g, '-'); return { start: d, end: d }; }
  return null;
}

// ========== CATEGORY DETECTION ==========
// Detect tournament category from tournament NAME
// DEFAULT: Rapid (most common worldwide)
// Only Classical or Blitz if explicitly mentioned
function detectCategory(name: string): 'Classical' | 'Rapid' | 'Blitz' {
  const n = (name || '').toLowerCase();

  // Check for Blitz keywords
  if (
    n.includes('blitz') ||
    n.includes('bullet') ||
    n.includes('lightning') ||
    n.includes('speed chess')
  ) {
    return 'Blitz';
  }

  // Check for Classical keywords - ONLY if explicitly mentioned
  if (
    n.includes('classical') ||
    n.includes('standard') ||
    n.includes('long play') ||
    n.includes('klassisch') ||    // German
    n.includes('classique') ||    // French
    n.includes('clásico') ||      // Spanish
    n.includes('classico')        // Italian/Portuguese
  ) {
    return 'Classical';
  }

  // Check for Rapid keywords
  if (
    n.includes('rapid') ||
    n.includes('schnell') ||      // German
    n.includes('rapide') ||       // French
    n.includes('rápido') ||       // Spanish
    n.includes('active') ||
    n.includes('semi-rapid') ||
    n.includes('semirapid')
  ) {
    return 'Rapid';
  }

  // DEFAULT: Rapid (most common format worldwide)
  return 'Rapid';
}

// ========== FIDE RATING DETECTION ==========
function detectFideRated(name: string): boolean {
  const n = (name || '').toLowerCase();
  if (n.includes('fide')) return true;
  if (n.includes('rated')) return true;
  if (n.includes('bewertet') || n.includes('gewertet')) return true; // German
  if (n.includes('noté') || n.includes('notée') || n.includes('homologué')) return true; // French
  if (n.includes('valorado')) return true; // Spanish
  if (n.includes('omologato')) return true; // Italian
  if (n.includes('classificado')) return true; // Portuguese
  if (n.includes('рейтинговый') || n.includes('рейтинговий')) return true; // Russian/Ukrainian
  // "ELO" as a standalone word (not inside another word)
  if (/\belo\b/.test(n)) return true;
  return false;
}

// ========== COUNTRY CODES ==========
const COUNTRY_CODES: Record<string, string> = {
  // Europe
  'GER': 'DE', 'FRA': 'FR', 'ESP': 'ES', 'ENG': 'GB', 'ITA': 'IT',
  'POL': 'PL', 'NED': 'NL', 'RUS': 'RU', 'UKR': 'UA', 'AUT': 'AT',
  'SUI': 'CH', 'CZE': 'CZ', 'HUN': 'HU', 'SWE': 'SE', 'NOR': 'NO',
  'DEN': 'DK', 'FIN': 'FI', 'BEL': 'BE', 'POR': 'PT', 'GRE': 'GR',
  'TUR': 'TR', 'SRB': 'RS', 'CRO': 'HR', 'SLO': 'SI', 'SVK': 'SK',
  'ROU': 'RO', 'BUL': 'BG', 'GEO': 'GE', 'ARM': 'AM', 'AZE': 'AZ',
  'LTU': 'LT', 'LAT': 'LV', 'EST': 'EE', 'BLR': 'BY', 'MDA': 'MD',
  'MKD': 'MK', 'BIH': 'BA', 'MNE': 'ME', 'ALB': 'AL', 'ISL': 'IS',
  'IRL': 'IE', 'SCO': 'GB', 'WLS': 'GB',

  // Americas
  'USA': 'US', 'CAN': 'CA', 'MEX': 'MX', 'ARG': 'AR', 'BRA': 'BR',
  'COL': 'CO', 'PER': 'PE', 'CHI': 'CL', 'VEN': 'VE', 'ECU': 'EC',
  'URU': 'UY', 'PAR': 'PY', 'BOL': 'BO', 'CUB': 'CU', 'PUR': 'PR',
  'CRC': 'CR', 'PAN': 'PA', 'DOM': 'DO',

  // Asia
  'IND': 'IN', 'CHN': 'CN', 'JPN': 'JP', 'KOR': 'KR', 'PHI': 'PH',
  'INA': 'ID', 'VIE': 'VN', 'MAS': 'MY', 'SGP': 'SG', 'THA': 'TH',
  'MYA': 'MM', 'BAN': 'BD', 'SRI': 'LK', 'PAK': 'PK', 'IRI': 'IR',
  'IRQ': 'IQ', 'UAE': 'AE', 'KSA': 'SA', 'QAT': 'QA', 'KUW': 'KW',
  'BRN': 'BH', 'JOR': 'JO', 'LBN': 'LB', 'SYR': 'SY', 'UZB': 'UZ',
  'KAZ': 'KZ', 'MGL': 'MN',

  // Africa
  'RSA': 'ZA', 'EGY': 'EG', 'MAR': 'MA', 'TUN': 'TN', 'ALG': 'DZ',
  'NGR': 'NG', 'KEN': 'KE', 'UGA': 'UG', 'ZIM': 'ZW', 'ZAM': 'ZM',
  'BOT': 'BW', 'NAM': 'NA', 'GHA': 'GH', 'CIV': 'CI', 'SEN': 'SN',
  'CMR': 'CM', 'ANG': 'AO', 'ETH': 'ET',

  // Oceania
  'AUS': 'AU', 'NZL': 'NZ', 'FIJ': 'FJ',

  // Middle East
  'ISR': 'IL',

  // Additional Europe
  'CYP': 'CY', 'LUX': 'LU', 'MLT': 'MT', 'AND': 'AD', 'SMR': 'SM', 'FRO': 'FO',

  // Additional Asia
  'NEP': 'NP', 'AFG': 'AF', 'TKM': 'TM', 'KGZ': 'KG', 'TJK': 'TJ',
  'MDV': 'MV', 'BRU': 'BN', 'CAM': 'KH', 'LAO': 'LA',
  'YEM': 'YE', 'OMA': 'OM', 'PLE': 'PS',

  // Additional Africa
  'LBA': 'LY', 'SUD': 'SD', 'MLI': 'ML', 'BUR': 'BF', 'TOG': 'TG',
  'BEN': 'BJ', 'RWA': 'RW', 'MOZ': 'MZ', 'MAD': 'MG', 'MRI': 'MU',
  'SEY': 'SC', 'CPV': 'CV',

  // Additional Americas
  'TRI': 'TT', 'JAM': 'JM', 'BAR': 'BB', 'GUY': 'GY', 'SUR': 'SR',
  'HAI': 'HT', 'NCA': 'NI', 'ESA': 'SV', 'HON': 'HN', 'GUA': 'GT',
};

function getCountryCode(fed: string): string {
  const m = fed.match(/\(\s*([A-Z]{2,3})\s*\)/);
  if (!m) return 'XX';
  if (COUNTRY_CODES[m[1]]) return COUNTRY_CODES[m[1]];
  // Fallback: derive from the full country name
  return countryNameToCode(getCountryName(fed)) ?? 'XX';
}

function getCountryName(fed: string): string {
  return fed.replace(/\s*\([^)]*\)/, '').trim() || 'Unknown';
}

// ========== SCRAPE ONE TOURNAMENT ==========
async function scrapeTournament(browser: Browser, url: string): Promise<ScrapedTournament | null> {
  let page = null;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const fullUrl = url.includes('turdet=') ? url : `${url}&turdet=YES`;
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await new Promise(r => setTimeout(r, 200));

    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};

      document.querySelectorAll('h2').forEach(h2 => {
        const t = h2.textContent?.trim();
        if (t && t.length > 3 && !t.includes('Chess-Results') && !result.name) {
          result.name = t;
        }
      });

      document.querySelectorAll('td').forEach((td, i, all) => {
        const label = td.textContent?.trim().toLowerCase() || '';
        const next = all[i + 1]?.textContent?.trim() || '';
        if (label === 'federation' && !result.federation) result.federation = next;
        if (label === 'date' && !result.date) result.date = next;
        if (label === 'location' && !result.location) result.location = next;
        if ((label === 'organizer(s)' || label === 'organizer') && !result.organizer) result.organizer = next;
        if (label.includes('time control') && !result.timeControl) result.timeControl = next;
        if (label === 'number of rounds' && !result.rounds) result.rounds = next;
      });

      document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent?.toLowerCase() || '';
        if ((text.includes('official homepage') || text.includes('organizer')) &&
            href.startsWith('http') && !href.includes('chess-results')) {
          result.externalLink = href;
        }
      });

      return result;
    });

    if (!data.name || !data.federation || !data.date) return null;
    const dates = parseDate(data.date);
    if (!dates) return null;

    const today = new Date().toISOString().split('T')[0];
    if (dates.start < today) return null;

    const idMatch = url.match(/tnr(\d+)/);
    if (!idMatch) return null;

    const countryCode = getCountryCode(data.federation);
    const country = getCountryName(data.federation);
    let city = data.location || country;
    if (city.includes(',')) city = city.split(',')[0].trim();

    return {
      id: `cr_${idMatch[1]}`,
      name: data.name,
      start_date: dates.start,
      end_date: dates.end,
      city,
      country,
      country_code: countryCode,
      time_control: data.timeControl || '',
      rounds: data.rounds ? parseInt(data.rounds) : null,
      organizer: data.organizer || null,
      source_url: url.split('&turdet')[0],
      external_link: data.externalLink || null,
      lat: null,
      lng: null
    };
  } catch {
    return null;
  } finally {
    if (page) try { await page.close(); } catch {}
  }
}

// ========== GET LINKS ==========
async function getLinks(browser: Browser, fed: string): Promise<string[]> {
  let page = null;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await page.goto(`https://chess-results.com/fed.aspx?lan=1&fed=${fed}`, {
      waitUntil: 'domcontentloaded', timeout: 15000
    });

    return await page.evaluate(() => {
      const links: string[] = [];
      document.querySelectorAll('a[href*="tnr"]').forEach(a => {
        let href = a.getAttribute('href') || '';
        if (!href.startsWith('http')) href = `https://chess-results.com/${href.replace(/^\//, '')}`;
        if (!href.includes('lan=')) href += href.includes('?') ? '&lan=1' : '?lan=1';
        links.push(href);
      });
      return [...new Set(links)];
    });
  } catch {
    return [];
  } finally {
    if (page) try { await page.close(); } catch {}
  }
}

// ========== SCRAPER CONFIGURATION ==========
const HIGH_VOLUME_COUNTRIES = [
  'IND', 'GER', 'USA', 'FRA', 'ESP', 'HUN', 'RUS', 'POL',
  'ITA', 'NED', 'CZE', 'AUT', 'SRB', 'ROU', 'UKR', 'BUL',
  'SWE', 'NOR', 'DEN', 'FIN', 'TUR', 'AZE', 'ARM', 'GEO', 'CHN'
];

const HIGH_VOLUME_LIMIT = 25;
const DEFAULT_LIMIT = 10;
const MAX_TOTAL = 2000;
const DELAY_BETWEEN_REQUESTS = 150;

// ========== MAIN ==========
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  TourneyRadar Scraper - GLOBAL COVERAGE');
  console.log('═'.repeat(60));
  console.log('\n  Configuration:');
  console.log(`    ✓ High-volume countries (${HIGH_VOLUME_COUNTRIES.length}): ${HIGH_VOLUME_LIMIT} tournaments each`);
  console.log(`    ✓ All other countries: ${DEFAULT_LIMIT} tournaments each`);
  console.log(`    ✓ Maximum total: ${MAX_TOTAL} tournaments`);
  console.log('    ✓ Smart category detection (Rapid default)\n');

  console.log('  Loading existing tournaments from DB...');
  const { data: existing } = await supabase
    .from('tournaments')
    .select('id')
    .like('id', 'cr_%');

  const existingIds = new Set((existing || []).map(t => t.id));
  console.log(`  Found ${existingIds.size} existing tournaments\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const tournaments: ScrapedTournament[] = [];
  const seen = new Set<string>();

  const feds = [
    // ========== EUROPE ==========
    'GER', 'FRA', 'ESP', 'ENG', 'ITA', 'POL', 'NED', 'RUS', 'UKR', 'AUT',
    'SUI', 'CZE', 'HUN', 'SWE', 'NOR', 'DEN', 'FIN', 'BEL', 'POR', 'GRE',
    'TUR', 'SRB', 'CRO', 'SLO', 'SVK', 'ROU', 'BUL', 'GEO', 'ARM', 'AZE',
    'LTU', 'LAT', 'EST', 'BLR', 'MDA', 'MKD', 'BIH', 'MNE', 'ALB', 'ISL',
    'IRL', 'SCO', 'WLS', 'CYP', 'LUX', 'MLT', 'AND', 'SMR', 'FRO',

    // ========== AMERICAS ==========
    'USA', 'CAN', 'MEX', 'ARG', 'BRA', 'COL', 'PER', 'CHI', 'VEN',
    'ECU', 'URU', 'PAR', 'BOL', 'CUB', 'PUR', 'CRC', 'PAN', 'DOM',
    'TRI', 'JAM', 'BAR', 'GUY', 'SUR', 'HAI', 'NCA', 'ESA', 'HON', 'GUA',

    // ========== ASIA ==========
    'IND', 'CHN', 'JPN', 'KOR', 'PHI', 'INA', 'VIE', 'MAS', 'SGP',
    'THA', 'MYA', 'BAN', 'SRI', 'PAK', 'IRI', 'IRQ', 'UAE', 'KSA',
    'QAT', 'KUW', 'BRN', 'JOR', 'LBN', 'SYR', 'UZB', 'KAZ', 'MGL',
    'NEP', 'AFG', 'TKM', 'KGZ', 'TJK', 'MDV', 'BRU', 'CAM', 'LAO',
    'YEM', 'OMA', 'PLE',

    // ========== AFRICA ==========
    'RSA', 'EGY', 'MAR', 'TUN', 'ALG', 'NGR', 'KEN', 'UGA', 'ZIM',
    'ZAM', 'BOT', 'NAM', 'GHA', 'CIV', 'SEN', 'CMR', 'ANG', 'ETH',
    'LBA', 'SUD', 'MLI', 'BUR', 'TOG', 'BEN', 'RWA', 'MOZ', 'MAD',
    'MRI', 'SEY', 'CPV',

    // ========== OCEANIA ==========
    'AUS', 'NZL', 'FIJ',

    // ========== MIDDLE EAST ==========
    'ISR',
  ];

  const uniqueFeds = [...new Set(feds)];

  try {
    console.log('Scraping federations (per-country limits)...\n');

    for (const fed of uniqueFeds) {
      if (tournaments.length >= MAX_TOTAL) break;

      const limit = HIGH_VOLUME_COUNTRIES.includes(fed) ? HIGH_VOLUME_LIMIT : DEFAULT_LIMIT;
      process.stdout.write(`  ${fed} (limit:${limit})... `);

      const links = await getLinks(browser, fed);

      const newLinks = links.filter(l => {
        const m = l.match(/tnr(\d+)/);
        if (!m) return false;
        const id = `cr_${m[1]}`;
        if (seen.has(m[1]) || existingIds.has(id)) return false;
        seen.add(m[1]);
        return true;
      });

      let fedCount = 0;
      for (const link of newLinks) {
        if (fedCount >= limit || tournaments.length >= MAX_TOTAL) break;
        const t = await scrapeTournament(browser, link);
        if (t) {
          tournaments.push(t);
          fedCount++;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`${fedCount} new`);
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
    }

    console.log(`\n  ✓ Found ${tournaments.length} new tournaments\n`);

    if (GOOGLE_MAPS_API_KEY && tournaments.length > 0) {
      console.log('Geocoding...\n');
      const cache = new Map<string, { lat: number; lng: number } | null>();
      let geocoded = 0;

      for (let i = 0; i < tournaments.length; i++) {
        const t = tournaments[i];
        const key = `${t.city}, ${t.country}`;

        if (!cache.has(key)) {
          const coords = await geocode(key);
          cache.set(key, coords);
          if (coords) geocoded++;
          await new Promise(r => setTimeout(r, 50));
        }

        const coords = cache.get(key);
        if (coords) {
          t.lat = coords.lat;
          t.lng = coords.lng;
        }

        process.stdout.write(`\r  ${i + 1}/${tournaments.length}`);
      }

      console.log(`\n\n  ✓ Geocoded ${geocoded} unique locations\n`);
    } else if (!GOOGLE_MAPS_API_KEY) {
      console.log('Geocoding: Skipped (no GOOGLE_MAPS_API_KEY)\n');
    }

    console.log('Saving to database...\n');
    let saved = 0;

    for (const t of tournaments) {
      const { error } = await supabase.from('tournaments').upsert({
        id: t.id,
        name: t.name,
        date: t.start_date,
        end_date: t.end_date,
        location: t.city,
        city: t.city,
        state: t.country,
        country: t.country,
        country_code: t.country_code,
        time_control: t.time_control,
        rounds: t.rounds,
        organizer_name: t.organizer,
        source: 'chess-results',
        source_url: t.source_url,
        external_link: t.external_link,
        lat: t.lat,
        lng: t.lng,
        status: 'published',
        category: detectCategory(t.name),
        format: 'Swiss',
        fide_rated: detectFideRated(t.name),
        scraped_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (!error) saved++;
    }

    console.log(`  ✓ Saved ${saved}/${tournaments.length}\n`);

    const withCoords = tournaments.filter(t => t.lat && t.lng).length;
    console.log('═'.repeat(60));
    console.log(`  DONE: ${saved} new tournaments added`);
    console.log(`  With map coordinates: ${withCoords}`);
    console.log('═'.repeat(60) + '\n');

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
