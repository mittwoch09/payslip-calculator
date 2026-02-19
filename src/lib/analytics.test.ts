import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackEvent, exportAnalytics, getAnalyticsSummary } from './analytics';

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

// Mock sessionStorage
const sessionStorageMock = (() => {
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
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-1234'),
});

describe('trackEvent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(crypto.randomUUID).mockReturnValue('test-uuid-1234' as `${string}-${string}-${string}-${string}-${string}`);
  });

  it('stores events in localStorage', () => {
    trackEvent('remittance', 'page_view');

    const events = exportAnalytics();
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('remittance');
    expect(events[0].action).toBe('page_view');
  });

  it('stores label and value when provided', () => {
    trackEvent('remittance', 'provider_click', 'wise', 500);

    const events = exportAnalytics();
    expect(events[0].label).toBe('wise');
    expect(events[0].value).toBe(500);
  });

  it('stores event without label and value when not provided', () => {
    trackEvent('remittance', 'page_view');

    const events = exportAnalytics();
    expect(events[0].label).toBeUndefined();
    expect(events[0].value).toBeUndefined();
  });

  it('stores timestamp and userLanguage', () => {
    const before = Date.now();
    trackEvent('remittance', 'page_view');
    const after = Date.now();

    const events = exportAnalytics();
    expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(events[0].timestamp).toBeLessThanOrEqual(after);
    expect(events[0].userLanguage).toBeTruthy();
  });

  it('appends multiple events', () => {
    trackEvent('remittance', 'page_view');
    trackEvent('remittance', 'provider_click', 'wise', 500);
    trackEvent('remittance', 'corridor_selected', 'SGD-BDT');

    const events = exportAnalytics();
    expect(events).toHaveLength(3);
  });

  it('caps events at 1000', () => {
    // Pre-fill with 1000 events
    const existingEvents = Array.from({ length: 1000 }, (_, i) => ({
      sessionId: 'test-session',
      timestamp: i,
      category: 'test',
      action: 'event',
      userLanguage: 'en',
    }));
    localStorage.setItem('analytics_events', JSON.stringify(existingEvents));

    // Add one more event
    trackEvent('remittance', 'page_view');

    const events = exportAnalytics();
    expect(events).toHaveLength(1000);
    // The newest event should be at the end
    expect(events[999].category).toBe('remittance');
    expect(events[999].action).toBe('page_view');
    // The oldest event (timestamp 0) should have been dropped
    expect(events[0].timestamp).toBe(1);
  });

  it('handles localStorage setItem errors gracefully', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});

    expect(() => {
      trackEvent('remittance', 'page_view');
    }).not.toThrow();

    expect(console.error).toHaveBeenCalled();
  });
});

describe('exportAnalytics', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns empty array when no events stored', () => {
    const events = exportAnalytics();
    expect(events).toEqual([]);
  });

  it('returns stored events', () => {
    trackEvent('remittance', 'page_view');
    trackEvent('remittance', 'provider_click', 'wise');

    const events = exportAnalytics();
    expect(events).toHaveLength(2);
  });

  it('returns events with correct structure', () => {
    trackEvent('remittance', 'page_view', 'SGD-BDT', 500);

    const events = exportAnalytics();
    expect(events[0]).toMatchObject({
      sessionId: expect.any(String),
      timestamp: expect.any(Number),
      category: 'remittance',
      action: 'page_view',
      label: 'SGD-BDT',
      value: 500,
      userLanguage: expect.any(String),
    });
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('analytics_events', 'invalid json {{{');

    const events = exportAnalytics();
    expect(events).toEqual([]);
  });
});

describe('getAnalyticsSummary', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns empty object when no events', () => {
    const summary = getAnalyticsSummary();
    expect(summary).toEqual({});
  });

  it('aggregates events by category:action', () => {
    trackEvent('remittance', 'page_view');
    trackEvent('remittance', 'page_view');
    trackEvent('remittance', 'provider_click', 'wise');

    const summary = getAnalyticsSummary();
    expect(summary['remittance:page_view']).toBe(2);
    expect(summary['remittance:provider_click']).toBe(1);
  });

  it('tracks multiple categories independently', () => {
    trackEvent('remittance', 'page_view');
    trackEvent('cta', 'impression');
    trackEvent('cta', 'impression');
    trackEvent('cta', 'click');

    const summary = getAnalyticsSummary();
    expect(summary['remittance:page_view']).toBe(1);
    expect(summary['cta:impression']).toBe(2);
    expect(summary['cta:click']).toBe(1);
  });
});

describe('session ID', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(crypto.randomUUID).mockClear();
    vi.mocked(crypto.randomUUID).mockReturnValue('test-uuid-1234' as `${string}-${string}-${string}-${string}-${string}`);
  });

  it('is consistent within a session', () => {
    trackEvent('remittance', 'page_view');
    trackEvent('remittance', 'provider_click', 'wise');

    const events = exportAnalytics();
    expect(events[0].sessionId).toBe(events[1].sessionId);
  });

  it('is stored in sessionStorage', () => {
    trackEvent('remittance', 'page_view');

    expect(sessionStorage.getItem('analytics_session_id')).toBeTruthy();
  });

  it('reuses existing session ID from sessionStorage', () => {
    sessionStorage.setItem('analytics_session_id', 'existing-session-id');

    trackEvent('remittance', 'page_view');

    const events = exportAnalytics();
    expect(events[0].sessionId).toBe('existing-session-id');
    // randomUUID should not have been called since we reused existing ID
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });

  it('creates new session ID when none exists', () => {
    // sessionStorage is cleared in beforeEach
    trackEvent('remittance', 'page_view');

    const events = exportAnalytics();
    expect(events[0].sessionId).toBe('test-uuid-1234');
    expect(crypto.randomUUID).toHaveBeenCalled();
  });
});
