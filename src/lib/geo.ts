export type GeoResult = {
  location: string;
  latitude: number;
  longitude: number;
};

export class GeoError extends Error {
  code: 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'lookup_failed';
  constructor(code: GeoError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('unsupported', 'Geolocation is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeoError('denied', 'Location permission was denied'));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeoError('timeout', 'Location request timed out'));
        } else {
          reject(new GeoError('unavailable', 'Could not determine your location'));
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

// Reverse-geocodes coordinates into a human-readable "City, State" string
// using OpenStreetMap's free Nominatim API (no key required).
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new GeoError('lookup_failed', 'Could not resolve your address');
  const data = await res.json();
  const addr = data?.address ?? {};
  const city = addr.city || addr.town || addr.village || addr.suburb || addr.county;
  const state = addr.state;
  if (city && state) return `${city}, ${state}`;
  if (data?.display_name) return data.display_name;
  throw new GeoError('lookup_failed', 'Could not resolve your address');
}

// Gets the device's current GPS position and turns it into a "City, State"
// label plus raw coordinates, ready to save on the profile.
export async function getCurrentLocation(): Promise<GeoResult> {
  const pos = await getPosition();
  const { latitude, longitude } = pos.coords;
  try {
    const location = await reverseGeocode(latitude, longitude);
    return { location, latitude, longitude };
  } catch {
    // Fall back to raw coordinates if reverse geocoding fails, so the
    // caller still has something usable.
    // Coarse (~11 km) on purpose: this label is shown publicly, so never derive it from the exact fix.
    return { location: `Near ${latitude.toFixed(1)}, ${longitude.toFixed(1)}`, latitude, longitude };
  }
}

// Calculate distance between two coordinates using Haversine formula (in km)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
