import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SCRAPER_CONFIG = {
  top10: ['IN', 'RU', 'US', 'DE', 'CN', 'FR', 'ES', 'NL', 'GB', 'PL'],
  targetCounts: {
    top10: 100,
    others: 50,
  },
  federationCodes: {
    IN: 'IND', RU: 'RUS', US: 'USA', DE: 'GER', CN: 'CHN',
    FR: 'FRA', ES: 'ESP', NL: 'NED', GB: 'ENG', PL: 'POL',
    IT: 'ITA', AT: 'AUT', CH: 'SUI', CZ: 'CZE', HU: 'HUN',
    SE: 'SWE', NO: 'NOR', DK: 'DEN', FI: 'FIN', BE: 'BEL',
    PT: 'POR', GR: 'GRE', TR: 'TUR', RS: 'SRB', HR: 'CRO',
    SI: 'SLO', SK: 'SVK', RO: 'ROU', BG: 'BUL', UA: 'UKR',
    BY: 'BLR', LT: 'LTU', LV: 'LAT', EE: 'EST', GE: 'GEO',
    AM: 'ARM', AZ: 'AZE', IL: 'ISR', AR: 'ARG', BR: 'BRA',
    MX: 'MEX', CA: 'CAN', AU: 'AUS', NZ: 'NZL', JP: 'JPN',
    KR: 'KOR', PH: 'PHI', ID: 'INA', MY: 'MAS', SG: 'SGP',
    TH: 'THA', VN: 'VIE', ZA: 'RSA', EG: 'EGY', MA: 'MAR',
  },
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    
    const { error: logError } = await supabase
      .from('scraper_logs')
      .insert({
        started_at: new Date().toISOString(),
        status: 'running',
        message: 'Cron job started',
      });

    if (logError) {
      console.log('Note: scraper_logs table may not exist yet');
    }

    const stats = {
      countriesProcessed: 0,
      tournamentsFound: 0,
      tournamentsAdded: 0,
      errors: [] as string[],
    };

    const response = {
      success: true,
      message: 'Scraper cron job triggered successfully',
      note: 'Full scraping requires Puppeteer which runs via npm run scrape',
      stats,
      duration: `${Date.now() - startTime}ms`,
      nextRun: 'Tomorrow at 2:00 AM UTC',
      config: {
        top10Countries: SCRAPER_CONFIG.top10,
        targetPerTop10: SCRAPER_CONFIG.targetCounts.top10,
        targetPerOther: SCRAPER_CONFIG.targetCounts.others,
      },
    };

    try {
      await supabase
        .from('scraper_logs')
        .insert({
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'completed',
          message: JSON.stringify(response),
          tournaments_found: stats.tournamentsFound,
          tournaments_added: stats.tournamentsAdded,
        });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    try {
      await supabase
        .from('scraper_logs')
        .insert({
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'failed',
          message: errorMessage,
        });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
