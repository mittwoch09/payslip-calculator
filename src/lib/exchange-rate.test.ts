import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchExchangeRates, getRateSource, getCacheTimestamp } from './exchange-rate';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Mock wise-rates module
vi.mock('./wise-rates', () => ({
  fetchAllWiseRates: vi.fn(),
}));

import { fetchAllWiseRates } from './wise-rates';
const mockFetchAllWiseRates = vi.mocked(fetchAllWiseRates);

describe('fetchExchangeRates', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockFetchAllWiseRates.mockReset();
  });

  it('returns cached rates when cache is valid', async () => {
    const cached = {
      rates: { 'SGD-BDT': 91.2 },
      timestamp: Date.now(),
      rateSource: 'wise',
    };
    localStorage.setItem('exchange_rates_cache', JSON.stringify(cached));

    const rates = await fetchExchangeRates();
    expect(rates['SGD-BDT']).toBe(91.2);
    // Should not call any API
    expect(mockFetchAllWiseRates).not.toHaveBeenCalled();
  });

  it('fetches from Wise when cache is expired', async () => {
    const cached = {
      rates: { 'SGD-BDT': 80 },
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
      rateSource: 'wise',
    };
    localStorage.setItem('exchange_rates_cache', JSON.stringify(cached));

    mockFetchAllWiseRates.mockResolvedValueOnce({
      'SGD-BDT': 91.5, 'SGD-INR': 63.2, 'SGD-CNY': 5.4,
      'SGD-MMK': 1590, 'SGD-PHP': 42.5, 'SGD-IDR': 11900, 'SGD-THB': 26.8,
    });

    const rates = await fetchExchangeRates();
    expect(rates['SGD-BDT']).toBe(91.5);
  });

  it('falls back to open.er-api.com when Wise fails', async () => {
    mockFetchAllWiseRates.mockResolvedValueOnce(null);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        result: 'success',
        base_code: 'SGD',
        conversion_rates: { BDT: 91.3, INR: 63.1, CNY: 5.42, MMK: 1590, PHP: 42.5, IDR: 11900, THB: 26.8 },
      }),
    }));

    const rates = await fetchExchangeRates();
    expect(rates['SGD-BDT']).toBe(91.3);
  });

  it('falls back to hardcoded rates when both APIs fail', async () => {
    mockFetchAllWiseRates.mockResolvedValueOnce(null);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')));

    const rates = await fetchExchangeRates();
    expect(rates['SGD-BDT']).toBe(91.2); // hardcoded fallback value
  });
});

describe('getRateSource', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no cache exists', () => {
    expect(getRateSource()).toBeNull();
  });

  it('returns "wise" when rates came from Wise', () => {
    const cached = {
      rates: { 'SGD-BDT': 91.2 },
      timestamp: Date.now(),
      rateSource: 'wise',
    };
    localStorage.setItem('exchange_rates_cache', JSON.stringify(cached));
    expect(getRateSource()).toBe('wise');
  });

  it('returns "open-er-api" when rates came from free API', () => {
    const cached = {
      rates: { 'SGD-BDT': 91.2 },
      timestamp: Date.now(),
      rateSource: 'open-er-api',
    };
    localStorage.setItem('exchange_rates_cache', JSON.stringify(cached));
    expect(getRateSource()).toBe('open-er-api');
  });

  it('returns "fallback" when using hardcoded rates', () => {
    const cached = {
      rates: { 'SGD-BDT': 91.2 },
      timestamp: Date.now(),
      rateSource: 'fallback',
    };
    localStorage.setItem('exchange_rates_cache', JSON.stringify(cached));
    expect(getRateSource()).toBe('fallback');
  });
});

describe('getCacheTimestamp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no cache exists', () => {
    expect(getCacheTimestamp()).toBeNull();
  });

  it('returns timestamp when cache exists', () => {
    const now = Date.now();
    const cached = {
      rates: { 'SGD-BDT': 91.2 },
      timestamp: now,
      rateSource: 'wise',
    };
    localStorage.setItem('exchange_rates_cache', JSON.stringify(cached));
    expect(getCacheTimestamp()).toBe(now);
  });
});
