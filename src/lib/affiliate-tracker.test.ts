import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildAffiliateUrl, trackClick, getClickHistory, buildPartnerizeUrl } from './affiliate-tracker';

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

describe('buildPartnerizeUrl', () => {
  const CAMREF = 'testCamref123';

  it('returns null when camref is empty string', () => {
    const result = buildPartnerizeUrl('', 'https://wise.com/send-money/send-money-to-bangladesh');
    expect(result).toBeNull();
  });

  it('builds correct URL without adref', () => {
    const destination = 'https://wise.com/send-money/send-money-to-bangladesh';
    const result = buildPartnerizeUrl(CAMREF, destination);
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-BDT corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-bangladesh';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-BDT');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-BDT/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-INR corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-india';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-INR');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-INR/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-CNY corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-china';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-CNY');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-CNY/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-MMK corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-myanmar';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-MMK');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-MMK/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-PHP corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-philippines';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-PHP');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-PHP/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-IDR corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-indonesia';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-IDR');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-IDR/destination:${encodeURIComponent(destination)}`
    );
  });

  it('builds correct URL with adref for SGD-THB corridor', () => {
    const destination = 'https://wise.com/send-money/send-money-to-thailand';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-THB');
    expect(result).toBe(
      `https://prf.hn/click/camref:${CAMREF}/adref:SGD-THB/destination:${encodeURIComponent(destination)}`
    );
  });

  it('URL-encodes destination containing query parameters', () => {
    const destination = 'https://wise.com/send-money?amount=500&currency=BDT';
    const result = buildPartnerizeUrl(CAMREF, destination, 'SGD-BDT');
    expect(result).toContain(encodeURIComponent(destination));
    expect(result).not.toContain('?amount=500');
  });

  it('omits adref segment when adref is undefined', () => {
    const destination = 'https://wise.com/send-money/send-money-to-bangladesh';
    const result = buildPartnerizeUrl(CAMREF, destination);
    expect(result).not.toContain('/adref:');
  });
});
