import type { DayEntry, DayType } from '../types/timecard';

const DATE_PATTERNS = [
  /(\d{4})-(\d{1,2})-(\d{1,2})/,
  /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
  /(\d{1,2})[/-](\d{1,2})/,
];

const TIME_PATTERN = /\b(\d{1,2})[:.](\d{2})\b/g;

function parseDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].match(/^\d{4}/)) {
        return match[0];
      } else if (match[3]) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        return `${match[3]}-${month}-${day}`;
      } else {
        const year = new Date().getFullYear();
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }
  return undefined;
}

function parseTimes(text: string): { clockIn?: string; clockOut?: string } {
  const times: string[] = [];
  let match;
  const pattern = new RegExp(TIME_PATTERN.source, 'g');
  while ((match = pattern.exec(text)) !== null) {
    const hour = parseInt(match[1]);
    const minute = match[2];
    if (hour >= 0 && hour <= 23) {
      times.push(`${hour.toString().padStart(2, '0')}:${minute}`);
    }
  }
  if (times.length >= 2) {
    return { clockIn: times[0], clockOut: times[1] };
  } else if (times.length === 1) {
    return { clockIn: times[0] };
  }
  return {};
}

export function parseTimecardText(text: string): DayEntry[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const entries: DayEntry[] = [];

  for (const line of lines) {
    const date = parseDate(line);
    const { clockIn, clockOut } = parseTimes(line);

    if (date && (clockIn || clockOut)) {
      entries.push({
        date,
        dayType: 'normal' as DayType,
        clockIn: clockIn || '08:00',
        clockOut: clockOut || '17:00',
        breakMinutes: 60,
      });
    }
  }

  return entries;
}
