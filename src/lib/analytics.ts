const ANALYTICS_KEY = 'analytics_events';
const MAX_EVENTS = 1000;

export interface AnalyticsEvent {
  sessionId: string;
  timestamp: number;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userLanguage: string;
}

/**
 * Get or create a session ID (persists for the browser session)
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Track an analytics event (stored in localStorage only — no external requests)
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
): void {
  try {
    const events = getStoredEvents();
    const event: AnalyticsEvent = {
      sessionId: getSessionId(),
      timestamp: Date.now(),
      category,
      action,
      label,
      value,
      userLanguage: navigator.language || 'en',
    };
    events.push(event);
    // Cap at MAX_EVENTS to prevent localStorage bloat
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

function getStoredEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(ANALYTICS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Export all analytics events as JSON (for manual review during Wise application)
 */
export function exportAnalytics(): AnalyticsEvent[] {
  return getStoredEvents();
}

/**
 * Get count of events by category
 */
export function getAnalyticsSummary(): Record<string, number> {
  const events = getStoredEvents();
  return events.reduce((acc, event) => {
    const key = `${event.category}:${event.action}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
