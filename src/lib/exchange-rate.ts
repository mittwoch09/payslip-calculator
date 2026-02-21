// Exchange rate fetcher using free API
// Uses exchangerate-api.com free tier (1500 requests/month)

import { fetchAllWiseRates } from './wise-rates';

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
  rateSource: 'wise' | 'open-er-api' | 'fallback';
}

/**
 * Fetch exchange rates from API with caching
 * Falls back to mock rates if API fails
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  // Check cache first
  const cached = getCachedRates();
  if (cached) {
    return cached.rates;
  }

  // Tier 1: Try Wise /v1/rates (public, no auth)
  try {
    const wiseRates = await fetchAllWiseRates();
    if (wiseRates && Object.keys(wiseRates).length >= 5) {
      // Fill in any missing corridors with fallback values
      const fallback = getFallbackRates();
      const mergedRates = { ...fallback, ...wiseRates };
      setCachedRates(mergedRates, 'wise');
      return mergedRates;
    }
  } catch {
    // Wise API failed, try next tier
  }

  // Tier 2: Try open.er-api.com (existing behavior)
  try {
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

    const rates: Record<string, number> = {
      'SGD-BDT': data.conversion_rates.BDT || 91.2,
      'SGD-INR': data.conversion_rates.INR || 63.1,
      'SGD-CNY': data.conversion_rates.CNY || 5.42,
      'SGD-MMK': data.conversion_rates.MMK || 1590,
      'SGD-PHP': data.conversion_rates.PHP || 42.5,
      'SGD-IDR': data.conversion_rates.IDR || 11900,
      'SGD-THB': data.conversion_rates.THB || 26.8,
    };

    setCachedRates(rates, 'open-er-api');
    return rates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using fallback:', error);
  }

  // Tier 3: Hardcoded fallback
  const fallbackRates = getFallbackRates();
  setCachedRates(fallbackRates, 'fallback');
  return fallbackRates;
}

function getCachedRates(): { rates: Record<string, number>; rateSource: CachedRates['rateSource'] } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedRates = JSON.parse(cached);
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;

    return isExpired ? null : { rates: parsed.rates, rateSource: parsed.rateSource || 'fallback' };
  } catch {
    return null;
  }
}

function setCachedRates(rates: Record<string, number>, rateSource: CachedRates['rateSource']): void {
  try {
    const cached: CachedRates = {
      rates,
      timestamp: Date.now(),
      rateSource,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

// Fallback rates — approximate mid-market as of February 2026
// Updated periodically; users always see "estimated" labels
function getFallbackRates(): Record<string, number> {
  return {
    'SGD-BDT': 91.2,
    'SGD-INR': 63.1,
    'SGD-CNY': 5.42,
    'SGD-MMK': 1590,
    'SGD-PHP': 42.5,
    'SGD-IDR': 11900,
    'SGD-THB': 26.8,
  };
}

/**
 * Get the timestamp of the last cached exchange rate fetch.
 * Returns null if no cached rates exist.
 */
export function getCacheTimestamp(): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedRates = JSON.parse(cached);
    return parsed.timestamp;
  } catch {
    return null;
  }
}

/**
 * Get the source of the currently cached exchange rates.
 * Returns null if no cached rates exist.
 */
export function getRateSource(): 'wise' | 'open-er-api' | 'fallback' | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedRates = JSON.parse(cached);
    return parsed.rateSource || null;
  } catch {
    return null;
  }
}

/**
 * Get rate for a specific corridor
 */
export async function getExchangeRate(corridorId: string): Promise<number> {
  const rates = await fetchExchangeRates();
  return rates[corridorId] || 1;
}
