// Wise /v1/rates API client
// Note: /v1/rates now requires authentication (returns 401 without token)
// Direct browser fetch will fail; falls back to proxy or open.er-api.com

const WISE_API_BASE = 'https://api.wise.com';

interface WiseRateResponse {
  source: string;
  target: string;
  rate: number;
  time: string;
}

/**
 * Fetch mid-market rate from Wise API.
 * /v1/rates now requires auth — direct fetch will likely return 401.
 * Falls back to proxy URL, then to open.er-api.com via exchange-rate.ts.
 */
export async function fetchWiseRate(
  source: string,
  target: string
): Promise<number | null> {
  const proxyUrl = import.meta.env.VITE_WISE_RATES_PROXY_URL;

  // Try direct fetch first
  try {
    const response = await fetch(
      `${WISE_API_BASE}/v1/rates?source=${source}&target=${target}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data: WiseRateResponse[] = await response.json();
      if (data.length > 0) return data[0].rate;
    }
  } catch {
    // Direct fetch failed (likely CORS), try proxy
  }

  // Try proxy if configured
  if (proxyUrl) {
    try {
      const response = await fetch(
        `${proxyUrl}/v1/rates?source=${source}&target=${target}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        const data: WiseRateResponse[] = await response.json();
        if (data.length > 0) return data[0].rate;
      }
    } catch {
      // Proxy also failed
    }
  }

  return null;
}

// All supported corridors
const CORRIDORS = ['BDT', 'INR', 'CNY', 'MMK', 'PHP', 'IDR', 'THB'] as const;

/**
 * Fetch rates for all supported corridors from Wise.
 * Returns a Record<corridorId, rate> or null if all fetches fail.
 */
export async function fetchAllWiseRates(): Promise<Record<string, number> | null> {
  const results = await Promise.allSettled(
    CORRIDORS.map(async (target) => {
      const rate = await fetchWiseRate('SGD', target);
      return { corridorId: `SGD-${target}`, rate };
    })
  );

  const rates: Record<string, number> = {};
  let hasAnyRate = false;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.rate !== null) {
      rates[result.value.corridorId] = result.value.rate;
      hasAnyRate = true;
    }
  }

  return hasAnyRate ? rates : null;
}
