import type { DayEntry, DayType } from '../types/timecard';

// Month name to number mapping
const MONTH_MAP: { [key: string]: number } = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'september': 9, 'sept': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12,
};

// Extract year and month from header text
function extractYearMonth(text: string): { year: number; month: number } {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // Default to current month

  // Try to find a 4-digit year (20XX)
  const yearMatch = text.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }

  // Try "20XX year MONTH month" pattern (English)
  const englishPattern = /20\d{2}\s+year\s+([a-z]+)\s+month/i;
  const englishMatch = text.match(englishPattern);
  if (englishMatch) {
    const monthName = englishMatch[1].toLowerCase();
    if (MONTH_MAP[monthName]) {
      month = MONTH_MAP[monthName];
    }
  }

  // Try "20XX 年 X月" or "X月份" pattern (Chinese)
  const chinesePattern = /(\d{1,2})\s*月/;
  const chineseMatch = text.match(chinesePattern);
  if (chineseMatch) {
    const monthNum = parseInt(chineseMatch[1]);
    if (monthNum >= 1 && monthNum <= 12) {
      month = monthNum;
    }
  }

  // Try to find month name anywhere in text
  const textLower = text.toLowerCase();
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (textLower.includes(name)) {
      month = num;
      break;
    }
  }

  return { year, month };
}

// Convert 4-digit time (0700) to HH:MM format (07:00)
function format4DigitTime(time: string): string {
  if (time.length !== 4) return time;
  const hour = time.substring(0, 2);
  const minute = time.substring(2, 4);
  return `${hour}:${minute}`;
}

// Parse a single line for day entry
function parseDayLine(
  line: string,
  year: number,
  month: number
): DayEntry | null {
  // Skip lines with "OFF" (rest days)
  if (/\bOFF\b/i.test(line)) {
    return null;
  }

  // Try new format: day number (1-31) + two 4-digit times
  // Pattern: starts with 1-2 digit number, then has two 4-digit numbers
  const newFormatMatch = line.match(/^\s*(\d{1,2})\s+.*?(\d{4})\s*[|\s]\s*(\d{4})/);
  if (newFormatMatch) {
    const day = parseInt(newFormatMatch[1]);
    const clockInRaw = newFormatMatch[2];
    const clockOutRaw = newFormatMatch[3];

    // Validate day number
    if (day < 1 || day > 31) {
      return null;
    }

    // Validate times (hour must be 00-23)
    const clockInHour = parseInt(clockInRaw.substring(0, 2));
    const clockOutHour = parseInt(clockOutRaw.substring(0, 2));
    if (clockInHour > 23 || clockOutHour > 23) {
      return null;
    }

    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const clockIn = format4DigitTime(clockInRaw);
    const clockOut = format4DigitTime(clockOutRaw);

    return {
      date: dateStr,
      dayType: 'normal' as DayType,
      clockIn,
      clockOut,
      breakMinutes: 60,
    };
  }

  // Try old format: full date with colon-separated times
  // Date patterns
  const datePatterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    /(\d{1,2})[/-](\d{1,2})/,
  ];

  let dateStr: string | undefined;
  for (const pattern of datePatterns) {
    const match = line.match(pattern);
    if (match) {
      if (match[0].match(/^\d{4}/)) {
        dateStr = match[0];
      } else if (match[3]) {
        const day = match[1].padStart(2, '0');
        const monthNum = match[2].padStart(2, '0');
        dateStr = `${match[3]}-${monthNum}-${day}`;
      } else {
        const day = match[1].padStart(2, '0');
        const monthNum = match[2].padStart(2, '0');
        dateStr = `${year}-${monthNum}-${day}`;
      }
      break;
    }
  }

  if (!dateStr) {
    return null;
  }

  // Parse colon-separated times (HH:MM or H:MM)
  const timePattern = /\b(\d{1,2})[:.](\d{2})\b/g;
  const times: string[] = [];
  let match;
  while ((match = timePattern.exec(line)) !== null) {
    const hour = parseInt(match[1]);
    const minute = match[2];
    if (hour >= 0 && hour <= 23) {
      times.push(`${hour.toString().padStart(2, '0')}:${minute}`);
    }
  }

  if (times.length >= 2) {
    return {
      date: dateStr,
      dayType: 'normal' as DayType,
      clockIn: times[0],
      clockOut: times[1],
      breakMinutes: 60,
    };
  } else if (times.length === 1) {
    return {
      date: dateStr,
      dayType: 'normal' as DayType,
      clockIn: times[0],
      clockOut: '17:00',
      breakMinutes: 60,
    };
  }

  return null;
}

export function parseTimecardText(text: string): DayEntry[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const entries: DayEntry[] = [];

  // Extract year and month from entire text (header)
  const { year, month } = extractYearMonth(text);

  for (const line of lines) {
    const entry = parseDayLine(line, year, month);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}
