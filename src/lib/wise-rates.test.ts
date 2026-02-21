import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWiseRate, fetchAllWiseRates } from './wise-rates';

describe('fetchWiseRate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns rate on successful direct fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ source: 'SGD', target: 'BDT', rate: 91.5, time: '2026-02-21T10:00:00Z' }]),
    }));

    const rate = await fetchWiseRate('SGD', 'BDT');
    expect(rate).toBe(91.5);
  });

  it('returns null when direct fetch fails and no proxy configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('CORS')));
    // Ensure no proxy URL is set
    vi.stubGlobal('import', { meta: { env: {} } });

    const rate = await fetchWiseRate('SGD', 'BDT');
    expect(rate).toBeNull();
  });

  it('returns null when API returns non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    }));

    const rate = await fetchWiseRate('SGD', 'BDT');
    expect(rate).toBeNull();
  });

  it('returns null when API returns empty array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    const rate = await fetchWiseRate('SGD', 'BDT');
    expect(rate).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')));

    const rate = await fetchWiseRate('SGD', 'BDT');
    expect(rate).toBeNull();
  });
});

describe('fetchAllWiseRates', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns rates for all corridors on success', async () => {
    const mockRates = [
      { source: 'SGD', target: 'BDT', rate: 91.5, time: '2026-02-21T10:00:00Z' },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRates),
    }));

    const rates = await fetchAllWiseRates();
    expect(rates).not.toBeNull();
    expect(rates!['SGD-BDT']).toBe(91.5);
    expect(rates!['SGD-INR']).toBe(91.5); // All return same mock
  });

  it('returns null when all fetches fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed')));

    const rates = await fetchAllWiseRates();
    expect(rates).toBeNull();
  });

  it('returns partial rates when some corridors fail', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ source: 'SGD', target: 'BDT', rate: 91.5, time: '' }]),
        });
      }
      return Promise.reject(new Error('Failed'));
    }));

    const rates = await fetchAllWiseRates();
    expect(rates).not.toBeNull();
    // At least 3 corridors should have rates
    expect(Object.keys(rates!).length).toBeGreaterThanOrEqual(3);
  });
});
