import { describe, it, expect } from 'vitest';
import { calculateQuotes, getMockRate } from './rate-calculator';
import type { Provider } from '../types/remittance';

describe('calculateQuotes', () => {
  const mockProviders: Provider[] = [
    {
      id: 'provider-a',
      name: 'Provider A',
      logo: '/logos/a.svg',
      affiliateUrl: 'https://a.com',
      rateMargin: 0.01, // 1% margin
      fees: {
        'SGD-BDT': { fixed: 2, percent: 0 },
      },
      deliveryTime: '1 day',
    },
    {
      id: 'provider-b',
      name: 'Provider B',
      logo: '/logos/b.svg',
      affiliateUrl: 'https://b.com',
      rateMargin: 0.02, // 2% margin
      fees: {
        'SGD-BDT': { fixed: 1, percent: 0.01 }, // $1 + 1%
      },
      deliveryTime: '2 days',
    },
  ];

  it('calculates quotes correctly', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);

    expect(quotes).toHaveLength(2);
    expect(quotes[0].sendAmount).toBe(100);
  });

  it('sorts by receiveAmount descending (best first)', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);

    expect(quotes[0].receiveAmount).toBeGreaterThanOrEqual(quotes[1].receiveAmount);
  });

  it('calculates fee correctly with fixed fee', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);
    const providerA = quotes.find(q => q.providerId === 'provider-a');

    expect(providerA?.fee).toBe(2); // fixed fee only
  });

  it('calculates fee correctly with percent fee', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);
    const providerB = quotes.find(q => q.providerId === 'provider-b');

    expect(providerB?.fee).toBe(2); // $1 fixed + 1% of $100
  });

  it('applies rate margin correctly', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);
    const providerA = quotes.find(q => q.providerId === 'provider-a');

    // Rate should be 90 * (1 - 0.01) = 89.1
    expect(providerA?.exchangeRate).toBeCloseTo(89.1, 1);
  });

  it('handles missing corridor with default fee', () => {
    const quotes = calculateQuotes(100, 'SGD-XXX', mockProviders, 50);

    expect(quotes).toHaveLength(2);
    // Should use default fee of 0
    quotes.forEach(q => {
      expect(q.fee).toBe(0);
    });
  });

  it('calculates receiveAmount with floor rounding', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);
    const providerA = quotes.find(q => q.providerId === 'provider-a');

    // (100 - 2) * 89.1 = 8731.8, floored to 8731
    expect(providerA?.receiveAmount).toBe(8731);
  });

  it('includes all required quote fields', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', mockProviders, 90);
    const quote = quotes[0];

    expect(quote).toHaveProperty('providerId');
    expect(quote).toHaveProperty('providerName');
    expect(quote).toHaveProperty('sendAmount');
    expect(quote).toHaveProperty('fee');
    expect(quote).toHaveProperty('exchangeRate');
    expect(quote).toHaveProperty('receiveAmount');
    expect(quote).toHaveProperty('deliveryTime');
    expect(quote).toHaveProperty('affiliateUrl');
  });

  it('handles zero amount', () => {
    const quotes = calculateQuotes(0, 'SGD-BDT', mockProviders, 90);

    quotes.forEach(q => {
      expect(q.sendAmount).toBe(0);
      expect(q.receiveAmount).toBeLessThanOrEqual(0);
    });
  });

  it('handles empty providers array', () => {
    const quotes = calculateQuotes(100, 'SGD-BDT', [], 90);

    expect(quotes).toHaveLength(0);
  });
});

describe('getMockRate', () => {
  it('returns correct rate for SGD-BDT', () => {
    expect(getMockRate('SGD-BDT')).toBe(90.5);
  });

  it('returns correct rate for SGD-INR', () => {
    expect(getMockRate('SGD-INR')).toBe(62.3);
  });

  it('returns correct rate for SGD-CNY', () => {
    expect(getMockRate('SGD-CNY')).toBe(5.35);
  });

  it('returns correct rate for SGD-MMK', () => {
    expect(getMockRate('SGD-MMK')).toBe(1580);
  });

  it('returns correct rate for SGD-PHP', () => {
    expect(getMockRate('SGD-PHP')).toBe(42.1);
  });

  it('returns correct rate for SGD-IDR', () => {
    expect(getMockRate('SGD-IDR')).toBe(11800);
  });

  it('returns correct rate for SGD-THB', () => {
    expect(getMockRate('SGD-THB')).toBe(27.2);
  });

  it('returns 1 for unknown corridor', () => {
    expect(getMockRate('XXX-YYY')).toBe(1);
  });

  it('handles empty string', () => {
    expect(getMockRate('')).toBe(1);
  });
});
