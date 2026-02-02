import type { DayEntry, DayType } from '../types/timecard';
import { correctOcrLine } from './ocr-postprocess';
export interface OcrLineWithBox {
  text: string;
  mean: number;
  box?: number[][];
}

export interface TimecardPreviewRow {
  date: string;
  timeInRaw: string;
  timeOutRaw: string;
  isOff: boolean;
  plusOne: boolean;
}

export interface TimecardParseResult {
  entries: DayEntry[];
  rows: TimecardPreviewRow[];
}

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

// Levenshtein distance for fuzzy string matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// Fuzzy match a word against month names, handling OCR errors
// Common English words that should never fuzzy-match to month names
const STOPWORDS = new Set([
  'out', 'in', 'date', 'the', 'for', 'and', 'not', 'off', 'day', 'sun',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'tot', 'amt', 'qty', 'ot',
  'no', 'yes', 'set', 'get', 'put', 'run', 'add', 'end', 'pay', 'due',
]);

function fuzzyMatchMonth(word: string): number | null {
  const w = word.toLowerCase();
  if (w.length < 3 || STOPWORDS.has(w)) return null;

  // Direct match first
  if (MONTH_MAP[w]) return MONTH_MAP[w];

  // Try prefix match (at least 3 chars)
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (name.length >= 3 && w.startsWith(name.slice(0, 3))) return num;
    if (w.length >= 3 && name.startsWith(w.slice(0, 3))) return num;
  }

  // Levenshtein distance matching
  let bestMatch: number | null = null;
  let bestDist = Infinity;
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (name.length < 3) continue;
    const dist = levenshtein(w, name);
    // Tight thresholds to avoid false positives on short words
    const minLen = Math.min(name.length, w.length);
    const threshold = minLen <= 3 ? 1 : Math.max(2, Math.floor(minLen / 3));
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      bestMatch = num;
    }
  }
  return bestMatch;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return days[month - 1] ?? 0;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

function isValidFourDigitTime(value: string): boolean {
  if (!/^\d{4}$/.test(value)) {
    return false;
  }
  const hour = parseInt(value.substring(0, 2));
  const minute = parseInt(value.substring(2, 4));
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

// Extract year and month from header text
function extractYearMonth(text: string): { year: number; month: number } {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // Default to current month
  let monthFound = false;

  // Try "Tahun YYYY" or "TahunYYYY" pattern (Malay)
  const tahunMatch = text.match(/[Tt]ahun\s*(20\d{2})/);
  if (tahunMatch) {
    year = parseInt(tahunMatch[1]);
  }

  // Try to find a 4-digit year (20XX) — only if Tahun didn't already match
  const yearMatch = text.match(/\b(20\d{2})\b/);
  if (!tahunMatch && yearMatch) {
    year = parseInt(yearMatch[1]);
  }

  // Try "20XX year MONTH month" pattern (English)
  const englishPattern = /20\d{2}\s+year\s+([a-z]+)\s+month/i;
  const englishMatch = text.match(englishPattern);
  if (englishMatch) {
    const monthName = englishMatch[1].toLowerCase();
    if (MONTH_MAP[monthName]) {
      month = MONTH_MAP[monthName];
      monthFound = true;
    }
  }

  // Try "20XX 年 X月" or "X月份" pattern (Chinese)
  if (!monthFound) {
    const chinesePattern = /(\d{1,2})\s*月/;
    const chineseMatch = text.match(chinesePattern);
    if (chineseMatch) {
      const monthNum = parseInt(chineseMatch[1]);
      if (monthNum >= 1 && monthNum <= 12) {
        month = monthNum;
        monthFound = true;
      }
    }
  }

  // Try to find month name anywhere in text (only full word matches)
  if (!monthFound) {
    const textLower = text.toLowerCase();
    for (const [name, num] of Object.entries(MONTH_MAP)) {
      // Require word boundary to avoid matching substrings in names
      if (new RegExp(`\\b${name}\\b`).test(textLower)) {
        month = num;
        monthFound = true;
        break;
      }
    }
  }

  // Fuzzy match: try each word against month names
  if (!monthFound) {
    const words = text.split(/[\s,.\-/]+/);
    for (const word of words) {
      const matched = fuzzyMatchMonth(word);
      if (matched) {
        month = matched;
        monthFound = true;
        break;
      }
    }
  }

  // Fallback: try "YYYY/MM" or "YYYY-MM" or "YYYY MM" near a year
  if (!monthFound && yearMatch) {
    const afterYear = text.substring(text.indexOf(yearMatch[1]) + 4);
    const nearMonthMatch = afterYear.match(/^\s*[.\/\-\s]\s*(\d{1,2})\b/);
    if (nearMonthMatch) {
      const m = parseInt(nearMonthMatch[1]);
      if (m >= 1 && m <= 12) {
        month = m;
      }
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

function toRawTime(time: string): string {
  if (/^\d{4}$/.test(time)) {
    return time;
  }
  return time.replace(/:/g, '');
}

function parseLineFlags(line: string): { isOff: boolean; plusOne: boolean } {
  return {
    isOff: /(?:\bOFF\b|\b0FF\b|\bO\s*F\s*F\b|\bSUN\w*\b|\bSnpoy\b|\bSDNDEY\b|\bcuday\b)/i.test(line),
    plusOne: /\+\s*[1lI|](?:\b|(?=OT|$))/i.test(line),
  };
}

function parseDateFromLine(line: string, year: number): string | null {
  const datePatterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    /(\d{1,2})[/-](\d{1,2})/,
  ];

  for (const pattern of datePatterns) {
    const match = line.match(pattern);
    if (match) {
      if (match[0].match(/^\d{4}/)) {
        const parsedYear = parseInt(match[1]);
        const parsedMonth = parseInt(match[2]);
        const parsedDay = parseInt(match[3]);
        if (!isValidDate(parsedYear, parsedMonth, parsedDay)) {
          return null;
        }
        return `${parsedYear}-${parsedMonth.toString().padStart(2, '0')}-${parsedDay.toString().padStart(2, '0')}`;
      }
      if (match[3]) {
        const parsedDay = parseInt(match[1]);
        const parsedMonth = parseInt(match[2]);
        const parsedYear = parseInt(match[3]);
        if (!isValidDate(parsedYear, parsedMonth, parsedDay)) {
          return null;
        }
        return `${parsedYear}-${parsedMonth.toString().padStart(2, '0')}-${parsedDay.toString().padStart(2, '0')}`;
      }
      const parsedDay = parseInt(match[1]);
      const parsedMonth = parseInt(match[2]);
      if (!isValidDate(year, parsedMonth, parsedDay)) {
        return null;
      }
      return `${year}-${parsedMonth.toString().padStart(2, '0')}-${parsedDay.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

function parseTimesFromLine(line: string): string[] {
  const times: string[] = [];
  const dateRanges: { start: number; end: number }[] = [];
  const datePatterns = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g,
  ];

  for (const pattern of datePatterns) {
    let dateMatch: RegExpExecArray | null;
    while ((dateMatch = pattern.exec(line)) !== null) {
      if (dateMatch.index !== undefined) {
        dateRanges.push({ start: dateMatch.index, end: dateMatch.index + dateMatch[0].length });
      }
    }
  }

  const timePattern = /\b(\d{1,2})[:.](\d{2})\b|\b(\d{4})\b/g;
  let timeMatch: RegExpExecArray | null;
  while ((timeMatch = timePattern.exec(line)) !== null) {
    if (timeMatch[1]) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        times.push(`${hour.toString().padStart(2, '0')}:${timeMatch[2]}`);
      }
      continue;
    }

    const token = timeMatch[3];
    const matchIndex = timeMatch.index;
    if (!token || matchIndex === undefined) {
      continue;
    }
    const inDateRange = dateRanges.some((range) => matchIndex >= range.start && matchIndex < range.end);
    // Skip year-like numbers (2020-2099) and invalid times
    if (inDateRange || !isValidFourDigitTime(token) || /^20[2-9]\d$/.test(token)) {
      continue;
    }
    const hour = token.substring(0, 2);
    const minute = token.substring(2, 4);
    times.push(`${hour}:${minute}`);
  }

  return times;
}

// Parse a single line for day entry
function parseDayEntry(
  line: string,
  year: number,
  month: number
): DayEntry | null {
  const { isOff, plusOne } = parseLineFlags(line);
  if (isOff) {
    return null;
  }

  // Try new format: day number (1-31) + two 4-digit times
  // Pattern: starts with 1-2 digit number, then has two 4-digit numbers
  const newFormatMatch = line.match(/^\s*(\d{1,2})\s+.*?(\d{4})\s*[|\s]\s*(\d{4})/);
  if (newFormatMatch) {
    const day = parseInt(newFormatMatch[1]);
    const clockInRaw = newFormatMatch[2];
    const clockOutRaw = newFormatMatch[3];

    if (!isValidDate(year, month, day)) {
      return null;
    }

    if (!isValidFourDigitTime(clockInRaw) || !isValidFourDigitTime(clockOutRaw)) {
      return null;
    }

    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const clockIn = format4DigitTime(clockInRaw);
    const clockOut = format4DigitTime(clockOutRaw);
    const entry: DayEntry = {
      date: dateStr,
      dayType: 'normal' as DayType,
      clockIn,
      clockOut,
      breakMinutes: 60,
    };
    if (plusOne) {
      entry.extraOtHours = 1;
    }
    return entry;
  }

  // Try colon-format: "3 7:00-19:00" or "3 7:00 19:00"
  // Also handles patterns like "400-19:00" → day 4, "00-19:00"
  const colonFormatMatch = line.match(/^\s*(\d{1,2})\s+(\d{1,2}):(\d{2})\s*[-–\s]\s*(\d{1,2}):(\d{2})/);
  if (colonFormatMatch) {
    const day = parseInt(colonFormatMatch[1]);
    const inH = parseInt(colonFormatMatch[2]);
    const inM = parseInt(colonFormatMatch[3]);
    const outH = parseInt(colonFormatMatch[4]);
    const outM = parseInt(colonFormatMatch[5]);

    if (isValidDate(year, month, day) && inH <= 23 && inM <= 59 && outH <= 23 && outM <= 59) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const clockIn = `${inH.toString().padStart(2, '0')}:${inM.toString().padStart(2, '0')}`;
      const clockOut = `${outH.toString().padStart(2, '0')}:${outM.toString().padStart(2, '0')}`;
      const entry: DayEntry = {
        date: dateStr,
        dayType: 'normal' as DayType,
        clockIn,
        clockOut,
        breakMinutes: 60,
      };
      if (plusOne) {
        entry.extraOtHours = 1;
      }
      return entry;
    }
  }

  // Try pattern with leading day merged: "400-19:00" → day 4, clockIn "00", clockOut "19:00"
  // Pattern: digit(s) + 2-digit-hour + colon + minute + dash + time
  const mergedDayColonMatch = line.match(/^\s*(\d)(\d{2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (mergedDayColonMatch) {
    const day = parseInt(mergedDayColonMatch[1]);
    const inH = parseInt(mergedDayColonMatch[2]);
    const inM = parseInt(mergedDayColonMatch[3]);
    const outH = parseInt(mergedDayColonMatch[4]);
    const outM = parseInt(mergedDayColonMatch[5]);

    if (isValidDate(year, month, day) && inH <= 23 && inM <= 59 && outH <= 23 && outM <= 59) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const clockIn = `${inH.toString().padStart(2, '0')}:${inM.toString().padStart(2, '0')}`;
      const clockOut = `${outH.toString().padStart(2, '0')}:${outM.toString().padStart(2, '0')}`;
      const entry: DayEntry = {
        date: dateStr,
        dayType: 'normal' as DayType,
        clockIn,
        clockOut,
        breakMinutes: 60,
      };
      if (plusOne) {
        entry.extraOtHours = 1;
      }
      return entry;
    }
  }

  // Try pattern "1000-1900" → day 10, clockIn "00", clockOut "1900" or clockIn "1000" clockOut "1900"
  // Heuristic: if starts with 10-31, it's likely a day number
  const mergedDayNoColonMatch = line.match(/^\s*(\d{2})(\d{2})\s*[-–]\s*(\d{4})/);
  if (mergedDayNoColonMatch) {
    const possibleDay = parseInt(mergedDayNoColonMatch[1]);
    const firstHour = mergedDayNoColonMatch[2];
    const outTime = mergedDayNoColonMatch[3];

    // Only if possibleDay is 10-31 (clear day range) and outTime is valid
    if (possibleDay >= 10 && possibleDay <= 31 && isValidDate(year, month, possibleDay) && isValidFourDigitTime(outTime)) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${possibleDay.toString().padStart(2, '0')}`;
      const clockIn = `${firstHour.substring(0, 2)}:${firstHour.substring(2, 4)}`;
      const clockOut = format4DigitTime(outTime);
      const entry: DayEntry = {
        date: dateStr,
        dayType: 'normal' as DayType,
        clockIn,
        clockOut,
        breakMinutes: 60,
      };
      if (plusOne) {
        entry.extraOtHours = 1;
      }
      return entry;
    }
  }

  // Try old format: full date with colon-separated times
  const dateStr = parseDateFromLine(line, year);
  if (!dateStr) {
    return null;
  }

  const times = parseTimesFromLine(line);
  if (times.length >= 2) {
    const entry: DayEntry = {
      date: dateStr,
      dayType: 'normal' as DayType,
      clockIn: times[0],
      clockOut: times[1],
      breakMinutes: 60,
    };
    if (plusOne) {
      entry.extraOtHours = 1;
    }
    return entry;
  }
  if (times.length === 1) {
    const entry: DayEntry = {
      date: dateStr,
      dayType: 'normal' as DayType,
      clockIn: times[0],
      clockOut: '17:00',
      breakMinutes: 60,
    };
    if (plusOne) {
      entry.extraOtHours = 1;
    }
    return entry;
  }

  return null;
}

function parsePreviewRow(
  line: string,
  year: number,
  month: number
): TimecardPreviewRow | null {
  const { isOff, plusOne } = parseLineFlags(line);

  let dateStr: string | null = null;
  let timeInRaw = '';
  let timeOutRaw = '';

  dateStr = parseDateFromLine(line, year);
  if (!dateStr) {
    const dayMatch = line.match(/^\s*(\d{1,2})\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      if (!isValidDate(year, month, day)) {
        return null;
      }
      dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }

  if (!dateStr) {
    return null;
  }

  const times = parseTimesFromLine(line);
  if (times.length >= 2) {
    timeInRaw = toRawTime(times[0]);
    timeOutRaw = toRawTime(times[1]);
  } else if (times.length === 1) {
    timeInRaw = toRawTime(times[0]);
    timeOutRaw = toRawTime('17:00');
  }

  return {
    date: dateStr,
    timeInRaw,
    timeOutRaw,
    isOff,
    plusOne,
  };
}

/** Fill in missing days so the preview always shows every day of the month */
export function fillMissingDays(
  rows: TimecardPreviewRow[],
  year: number,
  month: number
): TimecardPreviewRow[] {
  const totalDays = daysInMonth(year, month);
  const existingDates = new Set(rows.map((r) => r.date));
  const filled = [...rows];

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (!existingDates.has(dateStr)) {
      filled.push({
        date: dateStr,
        timeInRaw: '',
        timeOutRaw: '',
        isOff: false,
        plusOne: false,
      });
    }
  }

  // Sort by date
  filled.sort((a, b) => a.date.localeCompare(b.date));
  return filled;
}

/**
 * Split two-column OCR lines into separate day segments.
 * Timecards often have days 1-15 left and 16-31 right, OCR reads them
 * as a single line like "1 0700 1900 16 OFF".
 */
function splitTwoColumnLine(line: string): string[] {
  // Look for a second day number (16-31) appearing after initial content
  const secondDayPattern = /\b(1[6-9]|2\d|3[01])\b/g;
  let match;
  while ((match = secondDayPattern.exec(line)) !== null) {
    const pos = match.index;
    if (pos > 0) {
      const before = line.substring(0, pos).trim();
      const after = line.substring(pos).trim();
      // Only split if the "before" part starts with a day number (1-15)
      if (/^\d{1,2}\b/.test(before) && before.length > 1) {
        return [before, after];
      }
    }
  }
  return [line];
}

function parseLines(
  textLines: string[],
  year: number,
  month: number
): { entries: DayEntry[]; rows: TimecardPreviewRow[] } {
  const entries: DayEntry[] = [];
  const rows: TimecardPreviewRow[] = [];

  for (const rawLine of textLines) {
    if (rawLine.trim().length === 0) continue;
    const corrected = correctOcrLine(rawLine);
    // Split two-column lines into separate day segments
    const segments = splitTwoColumnLine(corrected);
    for (const segment of segments) {
      const row = parsePreviewRow(segment, year, month);
      if (row) {
        rows.push(row);
      }
      const entry = parseDayEntry(segment, year, month);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  return { entries, rows };
}

export function parseTimecardRaw(
  input: string | OcrLineWithBox[],
  year: number,
  month: number
): { entries: DayEntry[]; rows: TimecardPreviewRow[] } {
  if (typeof input === 'string') {
    const lines = input.split('\n').filter(line => line.trim().length > 0);
    return parseLines(lines, year, month);
  }
  // Structured lines path (same as parseTimecardLines minus fillMissingDays)
  const hasBoxes = input.some(l => l.box && l.box.length >= 4);
  const textLines = hasBoxes ? groupLinesByRow(input) : input.map(l => l.text);
  return parseLines(textLines, year, month);
}

export function parseTimecardText(text: string, overrideYear?: number, overrideMonth?: number): TimecardParseResult {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const extracted = extractYearMonth(text);
  const year = overrideYear ?? extracted.year;
  const month = overrideMonth ?? extracted.month;
  const { entries, rows } = parseLines(lines, year, month);
  return { entries, rows: fillMissingDays(rows, year, month) };
}

// Group OCR lines into rows by Y-coordinate proximity
function groupLinesByRow(ocrLines: OcrLineWithBox[], threshold: number = 15): string[] {
  if (ocrLines.length === 0) return [];

  // Get Y center for each line from bounding box
  const linesWithY = ocrLines.map((line) => {
    let yCenter = 0;
    if (line.box && line.box.length >= 4) {
      // box is array of [x,y] points (top-left, top-right, bottom-right, bottom-left)
      const topY = Math.min(line.box[0][1], line.box[1][1]);
      const bottomY = Math.max(line.box[2][1], line.box[3][1]);
      yCenter = (topY + bottomY) / 2;
    }
    return { text: line.text, yCenter };
  });

  // Sort by Y position
  linesWithY.sort((a, b) => a.yCenter - b.yCenter);

  // Group into rows
  const rows: { texts: string[]; yCenter: number }[] = [];
  for (const line of linesWithY) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(line.yCenter - lastRow.yCenter) < threshold) {
      lastRow.texts.push(line.text);
      lastRow.yCenter = (lastRow.yCenter + line.yCenter) / 2;
    } else {
      rows.push({ texts: [line.text], yCenter: line.yCenter });
    }
  }

  return rows.map((row) => row.texts.join(' '));
}

// Parse structured OCR output (with bounding boxes) for better table-aware parsing
export function parseTimecardLines(ocrLines: OcrLineWithBox[], overrideYear?: number, overrideMonth?: number): TimecardParseResult {
  const allText = ocrLines.map((l) => l.text).join('\n');
  const extracted = extractYearMonth(allText);
  const year = overrideYear ?? extracted.year;
  const month = overrideMonth ?? extracted.month;

  // If lines have bounding boxes, group by row for table-aware parsing
  const hasBoxes = ocrLines.some((l) => l.box && l.box.length >= 4);
  const textLines = hasBoxes
    ? groupLinesByRow(ocrLines)
    : ocrLines.map((l) => l.text);

  const { entries, rows } = parseLines(textLines, year, month);
  return { entries, rows: fillMissingDays(rows, year, month) };
}

/**
 * Remap existing preview rows and entries to a new year/month.
 * Keeps the day-of-month, swaps the year-month prefix, and fills missing days.
 */
export function remapYearMonth(
  prevRows: TimecardPreviewRow[],
  prevEntries: DayEntry[],
  year: number,
  month: number,
): { rows: TimecardPreviewRow[]; entries: DayEntry[] } {
  const prefix = `${year}-${month.toString().padStart(2, '0')}`;
  const totalDays = daysInMonth(year, month);

  const remapDate = (d: string) => {
    const day = parseInt(d.slice(8), 10);
    if (day < 1 || day > totalDays) return null;
    return `${prefix}-${day.toString().padStart(2, '0')}`;
  };

  const rows: TimecardPreviewRow[] = prevRows
    .map(r => {
      const nd = remapDate(r.date);
      return nd ? { ...r, date: nd } : null;
    })
    .filter((r): r is TimecardPreviewRow => r !== null);

  const entries: DayEntry[] = prevEntries
    .map(e => {
      const nd = remapDate(e.date);
      return nd ? { ...e, date: nd } : null;
    })
    .filter((e): e is DayEntry => e !== null);

  return { rows: fillMissingDays(rows, year, month), entries };
}
