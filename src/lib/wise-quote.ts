export interface WiseQuoteResult {
  fee: number;
  rate: number;
  receiveAmount: number;
  deliveryEstimate: string;
  rateExpirationTime: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_MS = 5000; // 5 seconds

function bucketAmount(amount: number): number {
  return Math.round(amount / 50) * 50;
}

function cacheKey(sourceCurrency: string, targetCurrency: string, amount: number): string {
  return `wise_quote_${sourceCurrency}-${targetCurrency}_${bucketAmount(amount)}`;
}

interface CacheEntry {
  data: WiseQuoteResult;
  expiresAt: number;
}

function readCache(key: string): WiseQuoteResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw) as CacheEntry;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: WiseQuoteResult): void {
  try {
    const entry: CacheEntry = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g. private browsing quota exceeded)
  }
}

export async function fetchWiseQuote(
  sourceCurrency: string,
  targetCurrency: string,
  sourceAmount: number
): Promise<WiseQuoteResult | null> {
  const proxyUrl = import.meta.env.VITE_WISE_PROXY_URL as string | undefined;
  if (!proxyUrl) return null;

  const key = cacheKey(sourceCurrency, targetCurrency, sourceAmount);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${proxyUrl}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceCurrency, targetCurrency, sourceAmount }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: WiseQuoteResult = (await response.json()) as WiseQuoteResult;
    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}
