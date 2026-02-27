import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('VITE_WISE_PROXY_URL', 'https://proxy.example.com');

import { fetchComparison } from './wise-compare';
import type { ComparisonProvider } from './wise-compare';

const mockProviders: ComparisonProvider[] = [
  {
    providerName: 'Wise',
    providerLogo: '/logos/wise.svg',
    fee: 3.5,
    rate: 91.0,
    sourceAmount: 500,
    targetAmount: 43680,
    speedMinHours: 0,
    speedMaxHours: 24,
    type: 'moneyTransferProvider',
    markup: 0,
  },
  {
    providerName: 'Remitly',
    providerLogo: '/logos/remitly.svg',
    fee: 3.99,
    rate: 90.5,
    sourceAmount: 500,
    targetAmount: 43300,
    speedMinHours: 0,
    speedMaxHours: 48,
    type: 'moneyTransferProvider',
    markup: 2.54,
  },
  {
    providerName: 'WorldRemit',
    providerLogo: null,
    fee: 2.0,
    rate: 89.0,
    sourceAmount: 500,
    targetAmount: 43800,
    speedMinHours: 1,
    speedMaxHours: 72,
    type: 'moneyTransferProvider',
    markup: 1.5,
  },
];

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

describe('fetchComparison', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns providers sorted by targetAmount descending on successful fetch', async () => {
    const unsorted = [...mockProviders].reverse();
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse(unsorted));

    const result = await fetchComparison('SGD', 'BDT', 500);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    // Sorted: WorldRemit(43800) > Wise(43680) > Remitly(43300)
    expect(result![0].targetAmount).toBe(43800);
    expect(result![1].targetAmount).toBe(43680);
    expect(result![2].targetAmount).toBe(43300);
  });

  it('returns null on 503 response', async () => {
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse('Service Unavailable', 503));

    const result = await fetchComparison('SGD', 'BDT', 500);

    expect(result).toBeNull();
  });

  it('returns null on generic network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchComparison('SGD', 'BDT', 500);

    expect(result).toBeNull();
  });

  it('returns cached data within 15-minute window without second fetch', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockProviders));

    const first = await fetchComparison('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(1);

    const second = await fetchComparison('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('triggers new fetch after cache expires (15 minutes)', async () => {
    vi.mocked(fetch).mockReturnValue(makeFetchResponse(mockProviders));

    const originalNow = Date.now();
    await fetchComparison('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(1);

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(originalNow + 15 * 60 * 1000 + 1);

    await fetchComparison('SGD', 'BDT', 500);
    expect(fetch).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('filters out providers with zero targetAmount', async () => {
    const withZero: ComparisonProvider[] = [
      ...mockProviders,
      {
        providerName: 'BadProvider',
        providerLogo: null,
        fee: 0,
        rate: 0,
        sourceAmount: 500,
        targetAmount: 0,
        speedMinHours: 0,
        speedMaxHours: 0,
        type: 'moneyTransferProvider',
        markup: 0,
      },
    ];
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse(withZero));

    const result = await fetchComparison('SGD', 'BDT', 500);

    expect(result).not.toBeNull();
    expect(result!.every(p => p.targetAmount > 0)).toBe(true);
    expect(result!.some(p => p.providerName === 'BadProvider')).toBe(false);
  });

  it('returns empty array (not null) when all providers have zero targetAmount', async () => {
    const allZero: ComparisonProvider[] = [
      {
        providerName: 'BadProvider',
        providerLogo: null,
        fee: 0,
        rate: 0,
        sourceAmount: 500,
        targetAmount: 0,
        speedMinHours: 0,
        speedMaxHours: 0,
        type: 'moneyTransferProvider',
        markup: 0,
      },
    ];
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse(allZero));

    const result = await fetchComparison('SGD', 'BDT', 500);

    // filtered result is an empty array, not null — the fetch succeeded
    expect(result).not.toBeNull();
    expect(result).toHaveLength(0);
  });

  it('builds the correct request URL with query params', async () => {
    vi.mocked(fetch).mockReturnValueOnce(makeFetchResponse(mockProviders));

    await fetchComparison('SGD', 'BDT', 500);

    expect(fetch).toHaveBeenCalledWith(
      'https://proxy.example.com/api/compare?sourceCurrency=SGD&targetCurrency=BDT&sendAmount=500',
      expect.anything()
    );
  });
});
