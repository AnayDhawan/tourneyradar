export function getCoordinatesFromState(state: string): { lat: number; lng: number } {
  const stateCoords: Record<string, { lat: number; lng: number }> = {
    "Andhra Pradesh": { lat: 15.9129, lng: 79.74 },
    "Arunachal Pradesh": { lat: 28.218, lng: 94.7278 },
    "Assam": { lat: 26.2006, lng: 92.9376 },
    "Bihar": { lat: 25.0961, lng: 85.3131 },
    "Chhattisgarh": { lat: 21.2787, lng: 81.8661 },
    "Goa": { lat: 15.2993, lng: 74.124 },
    "Gujarat": { lat: 23.0225, lng: 72.5714 },
    "Haryana": { lat: 29.0588, lng: 76.0856 },
    "Himachal Pradesh": { lat: 31.1048, lng: 77.1734 },
    "Jharkhand": { lat: 23.6102, lng: 85.2799 },
    "Karnataka": { lat: 12.9716, lng: 77.5946 },
    "Kerala": { lat: 10.8505, lng: 76.2711 },
    "Madhya Pradesh": { lat: 22.9734, lng: 78.6569 },
    "Maharashtra": { lat: 19.076, lng: 72.8777 },
    "Manipur": { lat: 24.6637, lng: 93.9063 },
    "Meghalaya": { lat: 25.467, lng: 91.3662 },
    "Mizoram": { lat: 23.1645, lng: 92.9376 },
    "Nagaland": { lat: 26.1584, lng: 94.5624 },
    "Odisha": { lat: 20.9517, lng: 85.0985 },
    "Punjab": { lat: 31.1471, lng: 75.3412 },
    "Rajasthan": { lat: 26.9124, lng: 75.7873 },
    "Sikkim": { lat: 27.533, lng: 88.5122 },
    "Tamil Nadu": { lat: 13.0827, lng: 80.2707 },
    "Telangana": { lat: 18.1124, lng: 79.0193 },
    "Tripura": { lat: 23.9408, lng: 91.9882 },
    "Uttar Pradesh": { lat: 26.8467, lng: 80.9462 },
    "Uttarakhand": { lat: 30.0668, lng: 79.0193 },
    "West Bengal": { lat: 22.5726, lng: 88.3639 },
    "Delhi": { lat: 28.6139, lng: 77.209 },
    "Jammu and Kashmir": { lat: 33.7782, lng: 76.5762 },
    "Ladakh": { lat: 34.1526, lng: 77.5771 },
    "Puducherry": { lat: 11.9416, lng: 79.8083 },
    "Chandigarh": { lat: 30.7333, lng: 76.7794 },
    "Andaman and Nicobar Islands": { lat: 11.7401, lng: 92.6586 },
    "Dadra and Nagar Haveli and Daman and Diu": { lat: 20.4283, lng: 72.8397 },
    "Lakshadweep": { lat: 8.2869, lng: 73.0609 },
  };

  return stateCoords[state] || { lat: 20.5937, lng: 78.9629 };
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];

/**
 * Google Maps Geocoding API - converts address to exact coordinates
 * Returns null if geocoding fails (API key missing, address not found, etc.)
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ Google Maps API key not found in environment variables");
    console.log("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file");
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log("✓ Geocoding successful:", {
        address,
        coordinates: location,
        formatted_address: data.results[0].formatted_address
      });
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else {
      console.error("❌ Geocoding failed:", {
        status: data.status,
        error_message: data.error_message || "No results found"
      });
      return null;
    }
  } catch (error) {
    console.error("❌ Geocoding request error:", error);
    return null;
  }
}

// Hardcoded coordinates for major chess cities
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // India
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  
  // USA
  'new york': { lat: 40.7128, lng: -74.0060 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'saint louis': { lat: 38.6270, lng: -90.1994 },
  'st. louis': { lat: 38.6270, lng: -90.1994 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  
  // Europe
  'paris': { lat: 48.8566, lng: 2.3522 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'moscow': { lat: 55.7558, lng: 37.6173 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'budapest': { lat: 47.4979, lng: 19.0402 },
  'warsaw': { lat: 52.2297, lng: 21.0122 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'geneva': { lat: 46.2044, lng: 6.1432 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'marseille': { lat: 43.2965, lng: 5.3698 },
  'nice': { lat: 43.7102, lng: 7.2620 },
  
  // Asia
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  
  // Others
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },
};

// Country center coordinates (fallback)
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'IN': { lat: 20.5937, lng: 78.9629 },
  'US': { lat: 37.0902, lng: -95.7129 },
  'FR': { lat: 46.2276, lng: 2.2137 },
  'DE': { lat: 51.1657, lng: 10.4515 },
  'GB': { lat: 55.3781, lng: -3.4360 },
  'RU': { lat: 61.5240, lng: 105.3188 },
  'CN': { lat: 35.8617, lng: 104.1954 },
  'ES': { lat: 40.4637, lng: -3.7492 },
  'IT': { lat: 41.8719, lng: 12.5674 },
  'NL': { lat: 52.1326, lng: 5.2913 },
  'AU': { lat: -25.2744, lng: 133.7751 },
  'CA': { lat: 56.1304, lng: -106.3468 },
  'BR': { lat: -14.2350, lng: -51.9253 },
  'AR': { lat: -38.4161, lng: -63.6167 },
};

// Nominatim rate limiting
let lastNominatimCall = 0;
const NOMINATIM_DELAY = 1100; // 1.1 seconds between calls

async function geocodeWithNominatim(city: string, country?: string): Promise<{ lat: number; lng: number } | null> {
  // Rate limit
  const now = Date.now();
  const timeSinceLastCall = now - lastNominatimCall;
  if (timeSinceLastCall < NOMINATIM_DELAY) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_DELAY - timeSinceLastCall));
  }
  lastNominatimCall = Date.now();
  
  try {
    const query = country ? `${city}, ${country}` : city;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TourneyRadar/1.0 (chess tournament aggregator, help@tourneyradar.com)'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error(`[Geocoding] Nominatim error for "${city}":`, error);
  }
  
  return null;
}

export function geocodeCity(city: string, countryCode?: string): { lat: number; lng: number } | null {
  const normalizedCity = city.toLowerCase().trim();
  
  // Check hardcoded cities first
  if (CITY_COORDINATES[normalizedCity]) {
    return CITY_COORDINATES[normalizedCity];
  }
  
  // Check country fallback
  if (countryCode && COUNTRY_COORDINATES[countryCode]) {
    return COUNTRY_COORDINATES[countryCode];
  }
  
  return null;
}

export async function geocodeTournaments(tournaments: any[]): Promise<any[]> {
  const result: any[] = [];
  const unknownCities: Set<string> = new Set();
  
  for (const tournament of tournaments) {
    // Skip if already has coordinates
    if (tournament.lat && tournament.lng) {
      result.push(tournament);
      continue;
    }
    
    // Try hardcoded first
    const coords = geocodeCity(tournament.city, tournament.country_code);
    if (coords) {
      result.push({ ...tournament, lat: coords.lat, lng: coords.lng });
      continue;
    }
    
    // Track unknown cities for Nominatim batch
    unknownCities.add(`${tournament.city}|${tournament.country}`);
    result.push(tournament);
  }
  
  // Batch geocode unknown cities with Nominatim (rate limited)
  if (unknownCities.size > 0) {
    console.log(`[Geocoding] ${unknownCities.size} unknown cities, using Nominatim...`);
    
    const cityCoords: Map<string, { lat: number; lng: number }> = new Map();
    
    for (const cityKey of unknownCities) {
      const [city, country] = cityKey.split('|');
      const coords = await geocodeWithNominatim(city, country);
      if (coords) {
        cityCoords.set(cityKey, coords);
        // Cache for future use
        CITY_COORDINATES[city.toLowerCase()] = coords;
      }
    }
    
    // Update tournaments with new coordinates
    for (let i = 0; i < result.length; i++) {
      const t = result[i];
      if (!t.lat || !t.lng) {
        const key = `${t.city}|${t.country}`;
        const coords = cityCoords.get(key);
        if (coords) {
          result[i] = { ...t, lat: coords.lat, lng: coords.lng };
        }
      }
    }
  }
  
  return result;
}

export async function geocodeSingleCity(city: string, country?: string): Promise<{ lat: number; lng: number } | null> {
  // Try hardcoded first
  const cached = geocodeCity(city, country ? getCountryCodeFromName(country) : undefined);
  if (cached) return cached;
  
  // Fall back to Nominatim
  return geocodeWithNominatim(city, country);
}

function getCountryCodeFromName(country: string): string | undefined {
  const map: Record<string, string> = {
    'india': 'IN',
    'united states': 'US',
    'usa': 'US',
    'france': 'FR',
    'germany': 'DE',
    'united kingdom': 'GB',
    'russia': 'RU',
    'china': 'CN',
    // Add more as needed
  };
  return map[country.toLowerCase()];
}
