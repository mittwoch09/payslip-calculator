import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildAffiliateUrl, trackClick, getClickHistory } from './affiliate-tracker';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('buildAffiliateUrl', () => {
  it('adds query parameters to URL', () => {
    const url = buildAffiliateUrl('https://example.com/send', {
      amount: 500,
      corridor: 'SGD-BDT',
    });

    expect(url).toContain('amount=500');
    expect(url).toContain('utm_campaign=SGD-BDT');
  });

  it('preserves existing query parameters', () => {
    const url = buildAffiliateUrl('https://example.com/send?ref=test', {
      amount: 100,
      corridor: 'SGD-INR',
    });

    expect(url).toContain('ref=test');
    expect(url).toContain('amount=100');
  });

  it('includes userId if provided', () => {
    const url = buildAffiliateUrl('https://example.com', {
      amount: 200,
      corridor: 'SGD-PHP',
      userId: 'user123',
    });

    expect(url).toContain('user_id=user123');
  });

  it('adds UTM parameters', () => {
    const url = buildAffiliateUrl('https://example.com', {
      amount: 100,
      corridor: 'SGD-BDT',
    });

    expect(url).toContain('utm_source=payslip-calculator');
    expect(url).toContain('utm_medium=affiliate');
    expect(url).toContain('utm_campaign=SGD-BDT');
  });

  it('encodes corridor parameter correctly', () => {
    const url = buildAffiliateUrl('https://example.com', {
      amount: 100,
      corridor: 'SGD-BDT',
    });

    const urlObj = new URL(url);
    expect(urlObj.searchParams.get('utm_campaign')).toBe('SGD-BDT');
  });

  it('handles HTTPS URLs', () => {
    const url = buildAffiliateUrl('https://secure.example.com', {
      amount: 100,
      corridor: 'SGD-INR',
    });

    expect(url).toMatch(/^https:\/\//);
  });

  it('does not include userId if not provided', () => {
    const url = buildAffiliateUrl('https://example.com', {
      amount: 100,
      corridor: 'SGD-BDT',
    });

    expect(url).not.toContain('user_id');
  });
});

describe('trackClick', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores click event in localStorage', () => {
    trackClick({
      timestamp: 1234567890,
      providerId: 'wise',
      corridor: 'SGD-BDT',
      amount: 500,
    });

    const history = getClickHistory();
    expect(history).toHaveLength(1);
    expect(history[0].providerId).toBe('wise');
  });

  it('appends to existing history', () => {
    trackClick({
      timestamp: 1,
      providerId: 'wise',
      corridor: 'SGD-BDT',
      amount: 100,
    });
    trackClick({
      timestamp: 2,
      providerId: 'remitly',
      corridor: 'SGD-INR',
      amount: 200,
    });

    const history = getClickHistory();
    expect(history).toHaveLength(2);
  });

  it('stores all event properties', () => {
    const event = {
      timestamp: 1234567890,
      providerId: 'wise',
      corridor: 'SGD-BDT',
      amount: 500,
    };

    trackClick(event);

    const history = getClickHistory();
    expect(history[0]).toEqual(event);
  });

  it('handles multiple clicks from same provider', () => {
    trackClick({
      timestamp: 1,
      providerId: 'wise',
      corridor: 'SGD-BDT',
      amount: 100,
    });
    trackClick({
      timestamp: 2,
      providerId: 'wise',
      corridor: 'SGD-INR',
      amount: 200,
    });

    const history = getClickHistory();
    expect(history).toHaveLength(2);
    expect(history.every(e => e.providerId === 'wise')).toBe(true);
  });

  it('handles localStorage errors gracefully', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});

    expect(() => {
      trackClick({
        timestamp: 1,
        providerId: 'wise',
        corridor: 'SGD-BDT',
        amount: 100,
      });
    }).not.toThrow();

    expect(console.error).toHaveBeenCalled();
  });
});

describe('getClickHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no history', () => {
    const history = getClickHistory();
    expect(history).toEqual([]);
  });

  it('returns stored click history', () => {
    trackClick({
      timestamp: 1,
      providerId: 'wise',
      corridor: 'SGD-BDT',
      amount: 100,
    });

    const history = getClickHistory();
    expect(history).toHaveLength(1);
  });

  it('handles localStorage errors gracefully', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('Storage access denied');
    });
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});

    const history = getClickHistory();
    expect(history).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('handles corrupted data gracefully', () => {
    localStorage.setItem('affiliate_clicks', 'invalid json');
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});

    const history = getClickHistory();
    expect(history).toEqual([]);
  });

  it('returns array in insertion order', () => {
    trackClick({
      timestamp: 1,
      providerId: 'wise',
      corridor: 'SGD-BDT',
      amount: 100,
    });
    trackClick({
      timestamp: 2,
      providerId: 'remitly',
      corridor: 'SGD-INR',
      amount: 200,
    });

    const history = getClickHistory();
    expect(history[0].timestamp).toBe(1);
    expect(history[1].timestamp).toBe(2);
  });
});
