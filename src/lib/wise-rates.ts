// Wise rates API client — uses the same proxy as quote/compare
// /v1/rates requires authentication; the Cloudflare Worker proxy handles auth.

interface WiseRateResponse {
  source: string;
  target: string;
  rate: number;
  time: string;
}

const TIMEOUT_MS = 5000;

/**
 * Fetch mid-market rate from Wise via the proxy.
 * Falls back to open.er-api.com via exchange-rate.ts if proxy is unavailable.
 */
export async function fetchWiseRate(
  source: string,
  target: string
): Promise<number | null> {
  const proxyUrl = import.meta.env.VITE_WISE_PROXY_URL as string | undefined;
  if (!proxyUrl) return null;

  try {
    const params = new URLSearchParams({ source, target });
    const response = await fetch(`${proxyUrl}/api/rates?${params.toString()}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data: WiseRateResponse[] = await response.json();
    if (data.length > 0) return data[0].rate;
  } catch {
    // Proxy unavailable — caller falls back to other rate sources
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
