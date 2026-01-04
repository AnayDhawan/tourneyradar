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
