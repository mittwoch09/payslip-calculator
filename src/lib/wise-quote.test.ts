import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('VITE_WISE_PROXY_URL', 'https://proxy.example.com');

import { fetchWiseQuote } from './wise-quote';
import type { WiseQuoteResult } from './wise-quote';

const mockQuoteResult: WiseQuoteResult = {
  fee: 3.5,
  rate: 91.0,
  receiveAmount: 43680,
  deliveryEstimate: 'Within 24 hours',
  rateExpirationTime: '2026-02-27T12:00:00Z',
};

function makeFetchResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe('fetchWiseQuote', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns parsed data on successful fetch', async () => {
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse(mockQuoteResult));

    const result = await fetchWiseQuote('SGD', 'BDT', 500);

    expect(result).toEqual(mockQuoteResult);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      'https://proxy.example.com/api/quote',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sourceCurrency: 'SGD', targetCurrency: 'BDT', sourceAmount: 500 }),
      })
    );
  });

  it('returns null on 503 response', async () => {
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse('Service Unavailable', 503));

    const result = await fetchWiseQuote('SGD', 'BDT', 500);

    expect(result).toBeNull();
  });

  it('returns null on network timeout (AbortError)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new DOMException('The user aborted a request.', 'AbortError')
    );

    const result = await fetchWiseQuote('SGD', 'BDT', 500);

    expect(result).toBeNull();
  });

  it('returns null on generic network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchWiseQuote('SGD', 'BDT', 500);

    expect(result).toBeNull();
  });

  it('returns cached data without calling fetch on cache hit', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockQuoteResult));

    const first = await fetchWiseQuote('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(1);

    const second = await fetchWiseQuote('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('triggers new fetch after cache expires (5 minutes)', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockQuoteResult));

    const originalNow = Date.now();
    await fetchWiseQuote('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(1);

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(originalNow + 5 * 60 * 1000 + 1);

    await fetchWiseQuote('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  describe('amount bucketing', () => {
    it('buckets 487 and 512 to the same cache key (both round to 500)', async () => {
      vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockQuoteResult));

      await fetchWiseQuote('SGD', 'BDT', 487);
      expect(fetch).toHaveBeenCalledTimes(1);

      // 512 rounds to 500, same bucket → cache hit, no second fetch
      await fetchWiseQuote('SGD', 'BDT', 512);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('buckets 550 and 574 to the same cache key (both round to 600)', async () => {
      vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockQuoteResult));

      await fetchWiseQuote('SGD', 'BDT', 550);
      expect(fetch).toHaveBeenCalledTimes(1);

      // 574 rounds to 600, same bucket → cache hit
      await fetchWiseQuote('SGD', 'BDT', 574);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('triggers separate fetch for different buckets (500 vs 600)', async () => {
      vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockQuoteResult));

      await fetchWiseQuote('SGD', 'BDT', 487); // bucket 500
      await fetchWiseQuote('SGD', 'BDT', 550); // bucket 600 — different key
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('returns null when VITE_WISE_PROXY_URL is not set', async () => {
    vi.stubEnv('VITE_WISE_PROXY_URL', '');

    const result = await fetchWiseQuote('SGD', 'BDT', 500);

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();

    vi.stubEnv('VITE_WISE_PROXY_URL', 'https://proxy.example.com');
  });
});
