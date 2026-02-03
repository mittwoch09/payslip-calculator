// Exchange rate fetcher using free API
// Uses exchangerate-api.com free tier (1500 requests/month)

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * Fetch exchange rates from API with caching
 * Falls back to mock rates if API fails
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  // Check cache first
  const cached = getCachedRates();
  if (cached) {
    return cached;
  }

  try {
    // Free API - no key needed for basic access
    const response = await fetch(
      'https://open.er-api.com/v6/latest/SGD'
    );

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data: ExchangeRateResponse = await response.json();

    if (data.result !== 'success') {
      throw new Error('API returned error');
    }

    // Extract rates we need
    const rates: Record<string, number> = {
      'SGD-BDT': data.conversion_rates.BDT || 90.5,
      'SGD-INR': data.conversion_rates.INR || 62.3,
      'SGD-CNY': data.conversion_rates.CNY || 5.35,
      'SGD-MMK': data.conversion_rates.MMK || 1580,
      'SGD-PHP': data.conversion_rates.PHP || 42.1,
      'SGD-IDR': data.conversion_rates.IDR || 11800,
      'SGD-THB': data.conversion_rates.THB || 27.2,
    };

    // Cache the rates
    setCachedRates(rates);

    return rates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using fallback:', error);
    return getFallbackRates();
  }
}

function getCachedRates(): Record<string, number> | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedRates = JSON.parse(cached);
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;

    return isExpired ? null : parsed.rates;
  } catch {
    return null;
  }
}

function setCachedRates(rates: Record<string, number>): void {
  try {
    const cached: CachedRates = {
      rates,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

function getFallbackRates(): Record<string, number> {
  return {
    'SGD-BDT': 90.5,
    'SGD-INR': 62.3,
    'SGD-CNY': 5.35,
    'SGD-MMK': 1580,
    'SGD-PHP': 42.1,
    'SGD-IDR': 11800,
    'SGD-THB': 27.2,
  };
}

/**
 * Get rate for a specific corridor
 */
export async function getExchangeRate(corridorId: string): Promise<number> {
  const rates = await fetchExchangeRates();
  return rates[corridorId] || 1;
}
