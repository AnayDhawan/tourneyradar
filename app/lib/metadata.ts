import { Metadata } from 'next';

const BASE_URL = 'https://www.tourneyradar.com';
const SITE_NAME = 'TourneyRadar';

export interface TournamentMetadata {
  id: string;
  name: string;
  date: string;
  end_date?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  category?: string;
  fide_rated?: boolean;
  organizer_name?: string;
  venue_name?: string;
  venue_address?: string;
  description?: string;
  source_url?: string;
}

export function generateTournamentMetadata(tournament: TournamentMetadata): Metadata {
  const location = [tournament.city, tournament.country_code].filter(Boolean).join(', ');
  const date = new Date(tournament.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const title = `${tournament.name} - ${location} | ${SITE_NAME}`;
  const description = `${tournament.name} - ${tournament.category || 'Chess'} tournament on ${date} in ${location}. ${tournament.fide_rated ? 'FIDE Rated. ' : ''}Find details, registration, and more on ${SITE_NAME}.`;

  return {
    title,
    description,
    keywords: [
      tournament.name,
      `chess tournament ${tournament.city}`,
      `chess tournament ${tournament.country}`,
      `${tournament.category} chess`,
      tournament.fide_rated ? 'FIDE rated tournament' : '',
      'chess competition',
      'OTB chess',
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE_URL}/tournaments/${tournament.id}`,
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: tournament.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${BASE_URL}/tournaments/${tournament.id}`,
    },
  };
}

export function generateCountryMetadata(countryCode: string, countryName: string, tournamentCount: number): Metadata {
  const title = `Chess Tournaments in ${countryName} | ${SITE_NAME}`;
  const description = `Discover ${tournamentCount}+ upcoming chess tournaments in ${countryName}. Find FIDE-rated Classical, Rapid, and Blitz events. Free tournament finder with interactive map.`;

  return {
    title,
    description,
    keywords: [
      `chess tournaments ${countryName}`,
      `${countryName} chess events`,
      `chess competitions ${countryName}`,
      'FIDE tournaments',
      'OTB chess',
      'chess tournament calendar',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE_URL}/country/${countryCode.toLowerCase()}`,
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `Chess Tournaments in ${countryName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/country/${countryCode.toLowerCase()}`,
    },
  };
}

export function generateCityMetadata(city: string, countryName: string, tournamentCount: number): Metadata {
  const title = `Chess Tournaments in ${city}, ${countryName} | ${SITE_NAME}`;
  const description = `Find ${tournamentCount}+ chess tournaments in ${city}, ${countryName}. Browse upcoming FIDE-rated events, Rapid, Blitz, and Classical tournaments near you.`;

  return {
    title,
    description,
    keywords: [
      `chess tournaments ${city}`,
      `chess tournaments in ${city}`,
      `${city} chess events`,
      `chess near ${city}`,
      'local chess tournaments',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE_URL}/city/${encodeURIComponent(city.toLowerCase())}`,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export function generateTournamentJsonLd(tournament: TournamentMetadata) {
  const location = [tournament.city, tournament.state, tournament.country].filter(Boolean).join(', ');
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: tournament.name,
    description: tournament.description || `${tournament.category || 'Chess'} tournament in ${location}`,
    startDate: tournament.date,
    endDate: tournament.end_date || tournament.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: tournament.venue_name || location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: tournament.city,
        addressRegion: tournament.state,
        addressCountry: tournament.country_code,
      },
    },
    organizer: tournament.organizer_name
      ? {
          '@type': 'Organization',
          name: tournament.organizer_name,
        }
      : undefined,
    url: `${BASE_URL}/tournaments/${tournament.id}`,
    image: `${BASE_URL}/og-image.png`,
    offers: {
      '@type': 'Offer',
      url: tournament.source_url || `${BASE_URL}/tournaments/${tournament.id}`,
      availability: 'https://schema.org/InStock',
    },
  };
}

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/favicon-96x96.png`,
    description: 'Find chess tournaments worldwide on an interactive map. Free, open-source platform.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: `${BASE_URL}/contact`,
    },
  };
}

export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: 'Find chess tournaments worldwide on an interactive map',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/tournaments?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
    },
  };
}

export const COUNTRY_NAMES: Record<string, string> = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AG: 'Antigua and Barbuda',
  AL: 'Albania', AM: 'Armenia', AO: 'Angola', AR: 'Argentina', AT: 'Austria', AU: 'Australia',
  AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina', BD: 'Bangladesh', BE: 'Belgium', BG: 'Bulgaria',
  BH: 'Bahrain', BO: 'Bolivia', BR: 'Brazil', BW: 'Botswana', BY: 'Belarus', CA: 'Canada',
  CH: 'Switzerland', CI: 'Ivory Coast', CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia',
  CR: 'Costa Rica', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic', DE: 'Germany', DK: 'Denmark',
  DO: 'Dominican Republic', DZ: 'Algeria', EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt', ES: 'Spain',
  ET: 'Ethiopia', FI: 'Finland', FJ: 'Fiji', FR: 'France', GB: 'United Kingdom', GE: 'Georgia',
  GH: 'Ghana', GR: 'Greece', HR: 'Croatia', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland',
  IL: 'Israel', IN: 'India', IQ: 'Iraq', IR: 'Iran', IS: 'Iceland', IT: 'Italy', JO: 'Jordan',
  JP: 'Japan', KE: 'Kenya', KR: 'South Korea', KW: 'Kuwait', KZ: 'Kazakhstan', LB: 'Lebanon',
  LK: 'Sri Lanka', LT: 'Lithuania', LV: 'Latvia', LY: 'Libya', MA: 'Morocco', MD: 'Moldova',
  ME: 'Montenegro', MK: 'North Macedonia', MM: 'Myanmar', MN: 'Mongolia', MX: 'Mexico',
  MY: 'Malaysia', NA: 'Namibia', NG: 'Nigeria', NL: 'Netherlands', NO: 'Norway', NZ: 'New Zealand',
  PA: 'Panama', PE: 'Peru', PH: 'Philippines', PK: 'Pakistan', PL: 'Poland', PR: 'Puerto Rico',
  PT: 'Portugal', PY: 'Paraguay', QA: 'Qatar', RO: 'Romania', RS: 'Serbia', RU: 'Russia',
  SA: 'Saudi Arabia', SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia', SK: 'Slovakia', SN: 'Senegal',
  SY: 'Syria', TH: 'Thailand', TN: 'Tunisia', TR: 'Turkey', UA: 'Ukraine', UG: 'Uganda',
  US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VE: 'Venezuela', VN: 'Vietnam',
  ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe',
};

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}
