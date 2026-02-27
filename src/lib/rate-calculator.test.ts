import { describe, it, expect } from 'vitest';
import { calculateQuotes, getMockRate, BANK_TRANSFER_BENCHMARK, estimateSavings } from './rate-calculator';
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
    expect(getMockRate('SGD-BDT')).toBe(91.2);
  });

  it('returns correct rate for SGD-INR', () => {
    expect(getMockRate('SGD-INR')).toBe(63.1);
  });

  it('returns correct rate for SGD-CNY', () => {
    expect(getMockRate('SGD-CNY')).toBe(5.42);
  });

  it('returns correct rate for SGD-MMK', () => {
    expect(getMockRate('SGD-MMK')).toBe(1590);
  });

  it('returns correct rate for SGD-PHP', () => {
    expect(getMockRate('SGD-PHP')).toBe(42.5);
  });

  it('returns correct rate for SGD-IDR', () => {
    expect(getMockRate('SGD-IDR')).toBe(11900);
  });

  it('returns correct rate for SGD-THB', () => {
    expect(getMockRate('SGD-THB')).toBe(26.8);
  });

  it('returns 1 for unknown corridor', () => {
    expect(getMockRate('XXX-YYY')).toBe(1);
  });

  it('handles empty string', () => {
    expect(getMockRate('')).toBe(1);
  });
});

describe('BANK_TRANSFER_BENCHMARK', () => {
  it('is exported with expected fixed fee', () => {
    expect(BANK_TRANSFER_BENCHMARK.fixed).toBe(25);
  });

  it('has zero percent fee', () => {
    expect(BANK_TRANSFER_BENCHMARK.percent).toBe(0);
  });

  it('has 4% rate margin', () => {
    expect(BANK_TRANSFER_BENCHMARK.rateMargin).toBe(0.04);
  });
});

describe('savingsVsBank in calculateQuotes', () => {
  const mockProviders: Provider[] = [
    {
      id: 'provider-a',
      name: 'Provider A',
      logo: '/logos/a.svg',
      affiliateUrl: 'https://a.com',
      rateMargin: 0.01, // 1% margin — much better than bank's 4%
      fees: {
        'SGD-BDT': { fixed: 2, percent: 0 },
      },
      deliveryTime: '1 day',
    },
  ];

  it('includes savingsVsBank field in each quote', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2);
    expect(quotes[0]).toHaveProperty('savingsVsBank');
  });

  it('returns positive savings for SGD 500 to BDT (provider beats bank)', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2);
    // Bank: (500 - 25) * (91.2 * 0.96) = 475 * 87.552 = 41,587 BDT
    // Provider A: (500 - 2) * (91.2 * 0.99) = 498 * 90.288 = 44,963 BDT
    // Savings should be positive
    expect(quotes[0].savingsVsBank).toBeGreaterThan(0);
  });

  it('calculates correct bankReceiveAmount baseline', () => {
    const midMarketRate = 91.2;
    const amount = 500;
    const bankFee = BANK_TRANSFER_BENCHMARK.fixed; // 25
    const bankRate = midMarketRate * (1 - BANK_TRANSFER_BENCHMARK.rateMargin); // 87.552
    const expectedBankReceive = Math.floor((amount - bankFee) * bankRate); // floor(475 * 87.552)

    const quotes = calculateQuotes(amount, 'SGD-BDT', mockProviders, midMarketRate);
    const providerReceive = quotes[0].receiveAmount;
    const savings = quotes[0].savingsVsBank!;

    expect(providerReceive - savings).toBe(expectedBankReceive);
  });
});

describe('estimateSavings', () => {
  const mockProviders: Provider[] = [
    {
      id: 'provider-a',
      name: 'Provider A',
      logo: '/logos/a.svg',
      affiliateUrl: 'https://a.com',
      rateMargin: 0.01,
      fees: {
        'SGD-BDT': { fixed: 2, percent: 0 },
      },
      deliveryTime: '1 day',
    },
  ];

  it('returns null when midMarketRate is 1 (unknown corridor)', () => {
    const result = estimateSavings(500, 'SGD-XXX', mockProviders, 1);
    expect(result).toBeNull();
  });

  it('returns null when midMarketRate is <= 1', () => {
    expect(estimateSavings(500, 'SGD-BDT', mockProviders, 0.5)).toBeNull();
    expect(estimateSavings(500, 'SGD-BDT', mockProviders, 1)).toBeNull();
  });

  it('returns a positive number for a valid corridor (SGD 500 to BDT)', () => {
    const savings = estimateSavings(500, 'SGD-BDT', mockProviders, 91.2);
    expect(savings).not.toBeNull();
    expect(savings!).toBeGreaterThan(0);
  });

  it('returns null when providers array is empty', () => {
    const savings = estimateSavings(500, 'SGD-BDT', [], 91.2);
    expect(savings).toBeNull();
  });
});

describe('quoteOverrides', () => {
  const mockProviders: Provider[] = [
    {
      id: 'wise',
      name: 'Wise',
      logo: '/logos/wise.svg',
      affiliateUrl: 'https://wise.com',
      rateMargin: 0.005,
      fees: {
        'SGD-BDT': { fixed: 1.51, percent: 0.0062 },
      },
      deliveryTime: '24 hours',
    },
    {
      id: 'remitly',
      name: 'Remitly',
      logo: '/logos/remitly.svg',
      affiliateUrl: 'https://remitly.com',
      rateMargin: 0.012,
      fees: {
        'SGD-BDT': { fixed: 3.99, percent: 0 },
      },
      deliveryTime: '1 day',
    },
  ];

  it('uses override fee and rate when provided', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2, {
      wise: { fee: 3.5, rate: 91.0, rateSource: 'live' },
    });
    const wiseQuote = quotes.find(q => q.providerId === 'wise');
    expect(wiseQuote?.fee).toBe(3.5);
    expect(wiseQuote?.exchangeRate).toBe(91.0);
    expect(wiseQuote?.rateSource).toBe('live');
  });

  it('uses estimated values when no override provided', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2);
    const wiseQuote = quotes.find(q => q.providerId === 'wise');
    expect(wiseQuote?.rateSource).toBe('estimated');
  });

  it('handles partial overrides (one provider has override, another does not)', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2, {
      wise: { fee: 3.5, rate: 91.0, rateSource: 'live' },
    });
    const wiseQuote = quotes.find(q => q.providerId === 'wise');
    const remitlyQuote = quotes.find(q => q.providerId === 'remitly');

    expect(wiseQuote?.rateSource).toBe('live');
    expect(remitlyQuote?.rateSource).toBe('estimated');
  });

  it('still sorts by receiveAmount with overrides', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2, {
      wise: { fee: 3.5, rate: 91.0 },
    });
    expect(quotes[0].receiveAmount).toBeGreaterThanOrEqual(quotes[1].receiveAmount);
  });

  it('backward compatible - works without quoteOverrides parameter', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2);
    expect(quotes).toHaveLength(2);
    quotes.forEach(q => expect(q.rateSource).toBe('estimated'));
  });

  it('defaults rateSource to live when override has no rateSource', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2, {
      wise: { fee: 3.5, rate: 91.0 },
    });
    const wiseQuote = quotes.find(q => q.providerId === 'wise');
    expect(wiseQuote?.rateSource).toBe('live');
  });

  it('passes through deliveryEstimate from override', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2, {
      wise: { fee: 3.5, rate: 91.0, rateSource: 'live', deliveryEstimate: 'Within 2 hours' },
    });
    const wiseQuote = quotes.find(q => q.providerId === 'wise');
    expect(wiseQuote?.deliveryEstimate).toBe('Within 2 hours');
    expect(wiseQuote?.deliveryTime).toBe('Within 2 hours');
  });

  it('uses provider deliveryTime when override has no deliveryEstimate', () => {
    const quotes = calculateQuotes(500, 'SGD-BDT', mockProviders, 91.2, {
      wise: { fee: 3.5, rate: 91.0 },
    });
    const wiseQuote = quotes.find(q => q.providerId === 'wise');
    expect(wiseQuote?.deliveryEstimate).toBeUndefined();
    expect(wiseQuote?.deliveryTime).toBe('24 hours');
  });
});
