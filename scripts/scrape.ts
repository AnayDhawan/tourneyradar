import puppeteer, { Browser } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { countryNameToCode } from '../lib/countryMap';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('   Run with: npm run scrape');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========== FAILURE LOGGING ==========
// Records scraper failures to the `scraper_logs` table instead of swallowing
// them, so failures are visible without digging through console output.
async function logScraperFailure(source: string, reason: string): Promise<void> {
  try {
    await supabase.from('scraper_logs').insert({
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'failed',
      message: `[${source}] ${reason}`,
    });
  } catch {
    // Logging must never crash the scraper itself.
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

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
  } catch (err) {
    await logScraperFailure(`geocode:${address}`, errorMessage(err));
  }
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
    n.includes('bijli') || 
    n.includes('lightning') ||
    n.includes('bullet') || 
    n.includes('ultra fast') || 
    n.includes('superfast') || 
    n.includes('super fast') || 
    n.includes('speed chess')
  ) {
    return 'Blitz';
  }
  
  // Check for Classical keywords - ONLY if explicitly mentioned
  if (
    n.includes('classical') || 
    n.includes('standard') || 
    n.includes('std') || 
    n.includes('shastriya') || 
    n.includes('long') || 
    n.includes('long format') || 
    n.includes('classical format') || 
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
    n.includes('rapids') || 
    n.includes('tez') || 
    n.includes('tezz') || 
    n.includes('jaldi') || 
    n.includes('fast') || 
    n.includes('quick') || 
    n.includes('speed') || 
    n.includes('rapido') || 
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
  if (n.includes('fide rated')) return true;
  if (n.includes('fide rating')) return true;
  if (n.includes('rating')) return true;
  if (n.includes('rating tournament')) return true;
  if (n.includes('rating event')) return true;
  if (n.includes('international rating')) return true;
  if (n.includes('elo')) return true;
  if (n.includes('elo rated')) return true;
  if (n.includes('ankit')) return true;
  if (n.includes('rating open')) return true;
  if (n.includes('rating championship')) return true;
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
  } catch (err) {
    await logScraperFailure(`scrapeTournament:${url}`, errorMessage(err));
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
  } catch (err) {
    await logScraperFailure(`getLinks:${fed}`, errorMessage(err));
    return [];
  } finally {
    if (page) try { await page.close(); } catch {}
  }
}

// ========== SCRAPER CONFIGURATION ==========
const SCRAPER_CONFIG = {
  // Top 10 chess countries - prioritize these
  top10: ['IND', 'RUS', 'USA', 'GER', 'CHN', 'FRA', 'ESP', 'NED', 'ENG', 'POL'],
  
  // Target tournament counts
  targets: {
    top10: 100,    // 100 tournaments per top 10 country
    tier2: 50,     // 50 tournaments per tier 2 country
    others: 25,    // 25 tournaments per other country
  },
  
  // Tier 2 countries (strong chess nations)
  tier2: [
    'ITA', 'AUT', 'SUI', 'CZE', 'HUN', 'SWE', 'NOR', 'DEN', 'UKR',
    'ARG', 'BRA', 'AUS', 'ISR', 'TUR', 'GRE', 'SRB', 'CRO', 'ROU',
  ],
  
  // Maximum total tournaments to scrape
  maxTotal: 2000,
  
  // Concurrency settings
  concurrentPages: 5,
  delayBetweenRequests: 150,
};

// ========== ARG PARSING ==========
function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

// ========== REGIONAL FEDERATION MAP ==========
const REGION_MAP: Record<string, string[]> = {
  'europe-west': [
    'GER', 'FRA', 'ESP', 'ENG', 'NED', 'ITA', 'AUT', 'SUI', 'SWE', 'NOR', 'DEN',
    'FIN', 'BEL', 'POR', 'ISL', 'IRL', 'SCO', 'WLS', 'LUX', 'MLT', 'AND', 'SMR', 'FRO', 'CYP',
  ],
  'europe-east': [
    'RUS', 'POL', 'CZE', 'HUN', 'UKR', 'TUR', 'GRE', 'SRB', 'CRO', 'ROU',
    'SLO', 'SVK', 'BUL', 'GEO', 'ARM', 'AZE', 'LTU', 'LAT', 'EST', 'BLR', 'MDA',
    'MKD', 'BIH', 'MNE', 'ALB',
  ],
  americas: [
    'USA', 'ARG', 'BRA',
    'CAN', 'MEX', 'COL', 'PER', 'CHI', 'VEN', 'ECU', 'URU', 'PAR', 'BOL', 'CUB', 'PUR', 'CRC', 'PAN', 'DOM',
    'TRI', 'JAM', 'BAR', 'GUY', 'SUR', 'HAI', 'NCA', 'ESA', 'HON', 'GUA',
  ],
  india: ['IND'],
  'east-asia': ['CHN', 'JPN', 'KOR', 'MGL'],
  'southeast-asia': ['PHI', 'INA', 'VIE', 'MAS', 'SGP', 'THA', 'MYA', 'BRU', 'CAM', 'LAO'],
  'south-asia': ['BAN', 'SRI', 'PAK', 'AFG', 'NEP', 'MDV'],
  'middle-east-central-asia': [
    'IRI', 'IRQ', 'UAE', 'KSA', 'QAT', 'KUW', 'BRN', 'JOR', 'LBN', 'SYR',
    'UZB', 'KAZ', 'TKM', 'KGZ', 'TJK', 'YEM', 'OMA', 'PLE',
  ],
  oceania: ['AUS', 'NZL', 'FIJ'],
  'africa-me': [
    'ISR',
    'RSA', 'EGY', 'MAR', 'TUN', 'ALG', 'NGR', 'KEN', 'UGA', 'ZIM', 'ZAM', 'BOT', 'NAM', 'GHA', 'CIV',
    'SEN', 'CMR', 'ANG', 'ETH', 'LBA', 'SUD', 'MLI', 'BUR', 'TOG', 'BEN', 'RWA', 'MOZ', 'MAD',
    'MRI', 'SEY', 'CPV',
  ],
};

// ========== PUSH TO SUPABASE ==========
async function pushTournaments(tournaments: ScrapedTournament[]): Promise<number> {
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
    if (!error) {
      saved++;
    } else {
      await logScraperFailure(`pushTournaments:${t.id}`, error.message);
    }
  }
  return saved;
}

// ========== MAIN ==========
async function main() {
  const pushFrom = getArg('--push-from');
  const regionArg = getArg('--region');
  const outputArg = getArg('--output');

  if (pushFrom) {
    const data: ScrapedTournament[] = JSON.parse(fs.readFileSync(pushFrom, 'utf8'));
    console.log(`\n  Pushing ${data.length} merged tournaments to Supabase...`);
    const saved = await pushTournaments(data);
    console.log(`  ✓ Saved ${saved}/${data.length}\n`);
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  TourneyRadar Scraper v9 - GLOBAL COVERAGE');
  console.log('═'.repeat(60));
  console.log('\n  Configuration:');
  console.log(`    ✓ Top 10 countries: ${SCRAPER_CONFIG.top10.length} (target: ${SCRAPER_CONFIG.targets.top10} each)`);
  console.log(`    ✓ Tier 2 countries: ${SCRAPER_CONFIG.tier2.length} (target: ${SCRAPER_CONFIG.targets.tier2} each)`);
  console.log(`    ✓ Maximum total: ${SCRAPER_CONFIG.maxTotal} tournaments`);
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
  const MAX = SCRAPER_CONFIG.maxTotal;
  const seen = new Set<string>();

  try {
    console.log('Phase 1: Collecting links from federations...\n');
    
    // Prioritized federation list
    const feds = [
      // ========== TOP 10 PRIORITY ==========
      ...SCRAPER_CONFIG.top10,
      
      // ========== TIER 2 ==========
      ...SCRAPER_CONFIG.tier2,
      
      // ========== EUROPE ==========
      'FIN', 'BEL', 'POR', 'SLO', 'SVK', 'BUL',
      'GEO', 'ARM', 'AZE', 'LTU', 'LAT', 'EST', 'BLR', 'MDA', 'MKD',
      'BIH', 'MNE', 'ALB', 'ISL', 'IRL', 'SCO', 'WLS',
      'CYP', 'LUX', 'MLT', 'AND', 'SMR', 'FRO',
      
      // ========== AMERICAS ==========
      'CAN', 'MEX', 'COL', 'PER', 'CHI', 'VEN',
      'ECU', 'URU', 'PAR', 'BOL', 'CUB', 'PUR', 'CRC', 'PAN', 'DOM',
      'TRI', 'JAM', 'BAR', 'GUY', 'SUR', 'HAI', 'NCA', 'ESA', 'HON', 'GUA',
      
      // ========== ASIA ==========
      'JPN', 'KOR', 'PHI', 'INA', 'VIE', 'MAS', 'SGP',
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
      'NZL', 'FIJ',
    ];
    
    // Remove duplicates
    const uniqueFeds = [...new Set(feds)];

    // Filter to region if --region flag passed
    let activeFeds = uniqueFeds;
    if (regionArg) {
      const key = regionArg.toLowerCase();
      const regionSet = new Set(REGION_MAP[key] ?? []);
      if (!regionSet.size) {
        console.error(`Unknown region: ${regionArg}. Valid: ${Object.keys(REGION_MAP).join(', ')}`);
        process.exit(1);
      }
      activeFeds = uniqueFeds.filter(f => regionSet.has(f));
      console.log(`  Region: ${regionArg} (${activeFeds.length}/${uniqueFeds.length} federations)\n`);
    }

    const allLinks: string[] = [];

    for (const fed of activeFeds) {
      process.stdout.write(`  ${fed}... `);
      const links = await getLinks(browser, fed);
      console.log(`${links.length}`);
      allLinks.push(...links);
      await new Promise(r => setTimeout(r, SCRAPER_CONFIG.delayBetweenRequests));
    }

    const unique = allLinks.filter(l => {
      const m = l.match(/tnr(\d+)/);
      if (!m) return false;
      const id = `cr_${m[1]}`;
      if (seen.has(m[1]) || existingIds.has(id)) return false;
      seen.add(m[1]);
      return true;
    });

    console.log(`\n  Total unique: ${unique.length}`);
    console.log(`  Already in DB: ${allLinks.length - unique.length - (allLinks.length - seen.size)}`);
    console.log(`  New to check: ${unique.length}\n`);

    console.log('Phase 2: Scraping new tournaments...\n');
    
    for (let i = 0; i < unique.length && tournaments.length < MAX; i++) {
      process.stdout.write(`\r  ${i + 1}/${unique.length} checked, ${tournaments.length} valid`);
      const t = await scrapeTournament(browser, unique[i]);
      if (t) tournaments.push(t);
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n\n  ✓ Found ${tournaments.length} new tournaments\n`);

    if (GOOGLE_MAPS_API_KEY && tournaments.length > 0) {
      console.log('Phase 3: Geocoding...\n');
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
      console.log('Phase 3: Skipped (no GOOGLE_MAPS_API_KEY)\n');
    }

    let saved = 0;
    if (outputArg) {
      console.log(`Phase 4: Writing to ${outputArg}...\n`);
      fs.writeFileSync(outputArg, JSON.stringify(tournaments, null, 2));
      saved = tournaments.length;
      console.log(`  ✓ Wrote ${saved} tournaments\n`);
    } else {
      console.log('Phase 4: Saving to database...\n');
      saved = await pushTournaments(tournaments);
      console.log(`  ✓ Saved ${saved}/${tournaments.length}\n`);
    }

    const withCoords = tournaments.filter(t => t.lat && t.lng).length;
    console.log('═'.repeat(60));
    console.log(`  DONE: ${saved} new tournaments added`);
    console.log(`  With map coordinates: ${withCoords}`);
    console.log('═'.repeat(60) + '\n');

  } finally {
    await browser.close();
  }
}

main().catch(async (err) => {
  console.error(err);
  await logScraperFailure('main', errorMessage(err));
  process.exit(1);
});
