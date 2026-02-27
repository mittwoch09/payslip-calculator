export interface ComparisonProvider {
  providerName: string;
  providerLogo: string | null;
  fee: number;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  speedMinHours: number;
  speedMaxHours: number;
  type: 'bank' | 'moneyTransferProvider';
  markup: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_MS = 5000; // 5 seconds

function cacheKey(sourceCurrency: string, targetCurrency: string, sendAmount: number): string {
  return `wise_compare_${sourceCurrency}-${targetCurrency}_${sendAmount}`;
}

interface CacheEntry {
  data: ComparisonProvider[];
  expiresAt: number;
}

function readCache(key: string): ComparisonProvider[] | null {
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

function writeCache(key: string, data: ComparisonProvider[]): void {
  try {
    const entry: CacheEntry = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g. private browsing quota exceeded)
  }
}

export async function fetchComparison(
  sourceCurrency: string,
  targetCurrency: string,
  sendAmount: number
): Promise<ComparisonProvider[] | null> {
  const proxyUrl = import.meta.env.VITE_WISE_PROXY_URL as string | undefined;
  if (!proxyUrl) return null;

  const key = cacheKey(sourceCurrency, targetCurrency, sendAmount);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const params = new URLSearchParams({
      sourceCurrency,
      targetCurrency,
      sendAmount: String(sendAmount),
    });

    const response = await fetch(`${proxyUrl}/api/compare?${params.toString()}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const raw: ComparisonProvider[] = (await response.json()) as ComparisonProvider[];

    const filtered = raw
      .filter((p) => p.targetAmount > 0)
      .sort((a, b) => b.targetAmount - a.targetAmount);

    writeCache(key, filtered);
    return filtered;
  } catch {
    return null;
  }
}
