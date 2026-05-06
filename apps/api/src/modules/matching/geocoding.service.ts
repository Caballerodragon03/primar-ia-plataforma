import { prisma } from '@primaria/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoCoords {
  lat: number;
  lng: number;
}

interface CacheEntry {
  coords: GeoCoords;
  expiresAt: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

// ─── In-memory cache (7-day TTL) ─────────────────────────────────────────────

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const cache = new Map<string, CacheEntry>();

// ─── Rate limiter: minimum 1100ms between Nominatim calls ─────────────────────

let lastCallTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < 1100) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastCallTime = Date.now();
}

// ─── Nominatim geocoding ──────────────────────────────────────────────────────

/**
 * Geocodes an address string using Nominatim (OpenStreetMap).
 * Uses a simple in-memory cache with 7-day TTL to avoid redundant requests.
 * Rate-limited to 1 request per 1100ms per Nominatim's usage policy.
 */
export async function geocodeAddress(address: string): Promise<GeoCoords | null> {
  const key = address.trim().toLowerCase();

  // Check cache
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.coords;
  }

  try {
    await waitForRateLimit();

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PrimAria/1.0 info@primar-ia.com',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[Geocoding] Nominatim returned ${response.status} for address: ${address}`);
      return null;
    }

    const results = (await response.json()) as NominatimResult[];
    if (!results || results.length === 0) {
      return null;
    }

    const first = results[0];
    if (!first) return null;
    const coords: GeoCoords = {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
    };

    if (isNaN(coords.lat) || isNaN(coords.lng)) {
      return null;
    }

    // Store in cache
    cache.set(key, { coords, expiresAt: Date.now() + TTL_MS });
    return coords;
  } catch (err) {
    console.error('[Geocoding] Failed to geocode address:', address, err);
    return null;
  }
}

/**
 * Fire-and-forget: geocodes the pedido's destinoFinal and persists
 * destinoLat/destinoLng to the database. Does not block the caller.
 */
export function geocodePedidoAsync(pedidoId: string, destinoFinal: string): void {
  void (async () => {
    try {
      const coords = await geocodeAddress(destinoFinal);
      if (coords) {
        await prisma.pedido.update({
          where: { id: pedidoId },
          data: { destinoLat: coords.lat, destinoLng: coords.lng },
        });
      }
    } catch (err) {
      console.error('[Geocoding] Failed to update pedido coords:', pedidoId, err);
    }
  })();
}
