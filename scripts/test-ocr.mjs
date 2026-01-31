#!/usr/bin/env node
/**
 * OCR Test Script - Comprehensive diagnostics for timecard OCR processing
 *
 * Tests @gutenye/ocr-node on 4 sample images and shows:
 * - Raw OCR output with bounding boxes
 * - Post-processed corrected lines
 * - Parsed timecard entries
 */

import Ocr from '@gutenye/ocr-node';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ============================================================================
// OCR Post-Processing Logic (inline from src/ocr/ocr-postprocess.ts)
// ============================================================================

const LETTER_TO_DIGIT = {
  D: '0', O: '0', o: '0', g: '9', q: '9', I: '1', l: '1', B: '8',
  S: '5', s: '5', Z: '2', z: '2', e: '0', w: '0', W: '0', t: '1',
  T: '1', n: '0', m: '0', U: '0', u: '0', r: '1', R: '1', f: '7', F: '7',
};

function fixLettersInDigitContext(text) {
  let result = text;
  for (let i = 0; i < 3; i++) {
    const prev = result;
    result = result
      .replace(/(\d)([A-Za-z])(\d)/g, (_match, before, letter, after) => {
        const replacement = LETTER_TO_DIGIT[letter];
        return replacement ? `${before}${replacement}${after}` : `${before}${letter}${after}`;
      })
      .replace(/([A-Za-z])(\d+)/g, (_match, letter, digits) => {
        const replacement = LETTER_TO_DIGIT[letter];
        return replacement ? `${replacement}${digits}` : `${letter}${digits}`;
      })
      .replace(/(\d+)([A-Za-z])/g, (_match, digits, letter) => {
        const replacement = LETTER_TO_DIGIT[letter];
        return replacement ? `${digits}${replacement}` : `${digits}${letter}`;
      });
    if (result === prev) break;
  }
  return result;
}

function fixPunctuationInDigits(text) {
  text = text.replace(/(\d{2,})[/|\\](\d)(?!\d)/g, '$10$2');
  text = text.replace(/(\d{3,})[/|\\](\d+)/g, '$1$2');
  text = text.replace(/(\d+)[/|\\](\d{3,})/g, '$1$2');
  return text;
}

function normalizeOff(text) {
  return text.replace(/\b[0Oo][Ff][Ff]\b/g, 'OFF');
}

function isValidTime4(s) {
  if (s.length !== 4) return false;
  const hour = parseInt(s.substring(0, 2));
  const minute = parseInt(s.substring(2, 4));
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function rejoinTimeFragments(text) {
  // 3+3 pattern
  text = text.replace(/\b(\d{3})\s+(\d{3})\b/g, (_match, a, b) => {
    const aPad = a + '0';
    const bPad = b + '0';
    if (isValidTime4(aPad) && isValidTime4(bPad)) {
      return `${aPad} ${bPad}`;
    }
    if (isValidTime4(aPad)) {
      return `${aPad} ${b}`;
    }
    return `${a} ${b}`;
  });

  // 4+3 pattern
  text = text.replace(/\b(\d{4})\s+(\d{3})\b/g, (_match, four, three) => {
    const padded = three + '0';
    if (isValidTime4(four) && isValidTime4(padded)) {
      return `${four} ${padded}`;
    }
    return `${four} ${three}`;
  });

  // 3+4 pattern
  text = text.replace(/\b(\d{3})\s+(\d{4})\b/g, (_match, three, four) => {
    const padded = three + '0';
    if (isValidTime4(padded) && isValidTime4(four)) {
      return `${padded} ${four}`;
    }
    return `${three} ${four}`;
  });

  // 6-digit merge
  text = text.replace(/\b(\d{6})\b/g, (_match, six) => {
    const a3 = six.substring(0, 3) + '0';
    const b3 = six.substring(3) + '0';
    if (isValidTime4(a3) && isValidTime4(b3)) {
      return `${a3} ${b3}`;
    }
    const first4 = six.substring(0, 4);
    const last2 = six.substring(4) + '00';
    if (isValidTime4(first4) && isValidTime4(last2)) {
      return `${first4} ${last2}`;
    }
    const first2 = six.substring(0, 2) + '00';
    const last4 = six.substring(2);
    if (isValidTime4(first2) && isValidTime4(last4)) {
      return `${first2} ${last4}`;
    }
    return six;
  });

  // 7-digit merge
  text = text.replace(/\b(\d{7})\b/g, (_match, seven) => {
    const first3 = seven.substring(0, 3) + '0';
    const last4 = seven.substring(3);
    if (isValidTime4(first3) && isValidTime4(last4)) {
      return `${first3} ${last4}`;
    }
    const first4 = seven.substring(0, 4);
    const last3 = seven.substring(4) + '0';
    if (isValidTime4(first4) && isValidTime4(last3)) {
      return `${first4} ${last3}`;
    }
    return seven;
  });

  // 8-digit merge
  text = text.replace(/\b(\d{8})\b/g, (_match, eight) => {
    const first4 = eight.substring(0, 4);
    const last4 = eight.substring(4);
    if (isValidTime4(first4) && isValidTime4(last4)) {
      return `${first4} ${last4}`;
    }
    return eight;
  });

  return text;
}

function fixHandwritingDigits(text) {
  // Leading F/f before 3+ digits → 7 (handwritten 7 looks like F)
  text = text.replace(/\b[Ff](\d{3,})/g, '7$1');

  // Leading $ before colon-digit (handwritten 7 misread as $): "$:60" → "7:60"
  text = text.replace(/\$(:?\d)/g, '7$1');

  // "±" in digit context → nothing or hyphen (OCR artifact from handwritten dash)
  text = text.replace(/(\d)±(\d)/g, '$1 $2');

  // "8" at start of time-like 4-digit sequence where 8xxx is invalid time but 0xxx is valid
  // e.g., "8730" → "0730" (handwritten 0 looks like 8)
  text = text.replace(/\b8(\d{3})\b/g, (_match, rest) => {
    const as8 = '8' + rest;
    const as0 = '0' + rest;
    // If 8xxx is a valid time hour (08xx is valid), keep it
    // But if the first two digits as hour > 23, it's likely a misread 0
    const hour8 = parseInt(as8.substring(0, 2));
    if (hour8 > 23 && isValidTime4(as0)) {
      return as0;
    }
    return as8;
  });

  return text;
}

function splitMergedDayDigits(text) {
  // Pattern: 9-10 digit sequence starting with a valid day (1-31) followed by 8 digits (two 4-digit times)
  return text.replace(/\b(\d{9,10})\b/g, (_match, digits) => {
    // Try 2-digit day prefix: e.g., "2707301930" → day=27, rest="07301930"
    if (digits.length >= 10) {
      const day2 = parseInt(digits.substring(0, 2));
      const rest = digits.substring(2);
      if (day2 >= 1 && day2 <= 31 && rest.length === 8) {
        const t1 = rest.substring(0, 4);
        const t2 = rest.substring(4);
        if (isValidTime4(t1) && isValidTime4(t2)) {
          return `${day2} ${t1} ${t2}`;
        }
      }
    }
    // Try 1-digit day prefix: e.g., "107301930" → day=1, rest="07301930"
    if (digits.length >= 9) {
      const day1 = parseInt(digits.substring(0, 1));
      const rest = digits.substring(1);
      if (day1 >= 1 && day1 <= 9 && rest.length === 8) {
        const t1 = rest.substring(0, 4);
        const t2 = rest.substring(4);
        if (isValidTime4(t1) && isValidTime4(t2)) {
          return `${day1} ${t1} ${t2}`;
        }
      }
    }
    return digits;
  });
}

function normalizePlusOne(text) {
  return text.replace(
    /(\d{3,})\s+([tTfF+])\s*([1l3Ii|])(?=\s|$)/g,
    '$1 +1'
  );
}

function correctOcrLine(raw) {
  let text = raw;
  text = normalizeOff(text);
  text = normalizePlusOne(text);
  text = fixHandwritingDigits(text);
  text = fixLettersInDigitContext(text);
  text = fixPunctuationInDigits(text);
  text = rejoinTimeFragments(text);
  text = splitMergedDayDigits(text);
  return text;
}

// ============================================================================
// Simplified Timecard Parser Logic (inline)
// ============================================================================

const MONTH_MAP = {
  'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
  'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
  'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'sept': 9, 'oct': 10,
  'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
};

// Levenshtein distance for fuzzy string matching
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

const STOPWORDS = new Set([
  'out', 'in', 'date', 'the', 'for', 'and', 'not', 'off', 'day', 'sun',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'tot', 'amt', 'qty', 'ot',
  'no', 'yes', 'set', 'get', 'put', 'run', 'add', 'end', 'pay', 'due',
]);

function fuzzyMatchMonth(word) {
  const w = word.toLowerCase();
  if (w.length < 3 || STOPWORDS.has(w)) return null;

  if (MONTH_MAP[w]) return MONTH_MAP[w];

  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (name.length >= 3 && w.startsWith(name.slice(0, 3))) return num;
    if (w.length >= 3 && name.startsWith(w.slice(0, 3))) return num;
  }

  let bestMatch = null;
  let bestDist = Infinity;
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (name.length < 3) continue;
    const dist = levenshtein(w, name);
    const minLen = Math.min(name.length, w.length);
    const threshold = minLen <= 3 ? 1 : Math.max(2, Math.floor(minLen / 3));
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      bestMatch = num;
    }
  }
  return bestMatch;

  return null;
}

function extractYearMonth(text) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
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

function isValidFourDigitTime(value) {
  if (!/^\d{4}$/.test(value)) return false;
  const hour = parseInt(value.substring(0, 2));
  const minute = parseInt(value.substring(2, 4));
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function parseLineFlags(line) {
  return {
    isOff: /(?:\bOFF\b|\b0FF\b|\bO\s*F\s*F\b|\bSUN\w*\b|\bcuday\b)/i.test(line),
    plusOne: /\+\s*[1lI|](?:\b|(?=OT|$))/i.test(line),
  };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return days[month - 1] ?? 0;
}

function isValidDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

function parseDayEntry(line, year, month) {
  const { isOff, plusOne } = parseLineFlags(line);
  if (isOff) {
    return { type: 'OFF', plusOne };
  }

  // New format: day number (1-31) + two 4-digit times
  const newFormatMatch = line.match(/^\s*(\d{1,2})\s+.*?(\d{4})\s*[|\s]\s*(\d{4})/);
  if (newFormatMatch) {
    const day = parseInt(newFormatMatch[1]);
    const clockInRaw = newFormatMatch[2];
    const clockOutRaw = newFormatMatch[3];

    if (!isValidDate(year, month, day) || !isValidFourDigitTime(clockInRaw) || !isValidFourDigitTime(clockOutRaw)) {
      return null;
    }

    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return {
      date: dateStr,
      clockIn: `${clockInRaw.substring(0, 2)}:${clockInRaw.substring(2, 4)}`,
      clockOut: `${clockOutRaw.substring(0, 2)}:${clockOutRaw.substring(2, 4)}`,
      plusOne,
    };
  }

  // Try colon-format: "3 7:00-19:00" or "3 7:00 19:00"
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
      return {
        date: dateStr,
        clockIn,
        clockOut,
        plusOne,
      };
    }
  }

  return null;
}

function splitTwoColumnLine(line) {
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

// ============================================================================
// Test Images Configuration
// ============================================================================

const TEST_IMAGES = [
  '/Users/jun/project/timecard_test_image_01.png',
  '/Users/jun/project/timecard_test_image_02.jpg',
  '/Users/jun/project/timecard_test_image_03.jpg',
  '/Users/jun/project/timecard_test_image_04.jpg',
];

const MODELS = {
  detPath: join(projectRoot, 'public/models/en_det.onnx'),
  recPath: join(projectRoot, 'public/models/en_rec.onnx'),
  dictPath: join(projectRoot, 'public/models/en_dict.txt'),
};

// ============================================================================
// Main Test Function
// ============================================================================

async function testOcrOnImage(imagePath, ocrInstance) {
  console.log('\n' + '='.repeat(80));
  console.log(`IMAGE: ${imagePath}`);
  console.log('='.repeat(80));

  if (!existsSync(imagePath)) {
    console.log('❌ FILE NOT FOUND');
    return;
  }

  try {
    // Run OCR
    const result = await ocrInstance.detect(imagePath);

    // Extract all text for year/month detection
    const allText = result.map(r => r.text).join('\n');
    const { year, month } = extractYearMonth(allText);
    console.log(`\n📅 DETECTED YEAR/MONTH: ${year}-${month.toString().padStart(2, '0')}`);

    // Print raw OCR lines
    console.log('\n📄 RAW OCR OUTPUT:');
    console.log('-'.repeat(80));
    result.forEach((line, idx) => {
      const box = line.box ? `[${line.box.map(pt => `(${pt[0].toFixed(0)},${pt[1].toFixed(0)})`).join(' ')}]` : 'no-box';
      console.log(`[${idx}] text="${line.text}" mean=${line.mean.toFixed(3)} box=${box}`);
    });

    // Apply post-processing
    console.log('\n🔧 CORRECTED LINES:');
    console.log('-'.repeat(80));
    const correctedLines = result.map((line, idx) => {
      const raw = line.text;
      const corrected = correctOcrLine(raw);
      const changed = raw !== corrected ? '✅ CHANGED' : '   (no change)';
      console.log(`[${idx}] RAW: "${raw}"`);
      console.log(`     COR: "${corrected}" ${changed}`);
      return corrected;
    });

    // Parse day entries
    console.log('\n📊 PARSED DAY ENTRIES:');
    console.log('-'.repeat(80));
    const entries = [];
    correctedLines.forEach((line, idx) => {
      const segments = splitTwoColumnLine(line);
      for (const segment of segments) {
        const entry = parseDayEntry(segment, year, month);
        if (entry) {
          entries.push(entry);
          if (entry.type === 'OFF') {
            console.log(`[${idx}] ${entry.type} ${entry.plusOne ? '+1' : ''}`);
          } else {
            console.log(`[${idx}] ${entry.date} | ${entry.clockIn}-${entry.clockOut} ${entry.plusOne ? '+1' : ''}`);
          }
        }
      }
    });

    if (entries.length === 0) {
      console.log('⚠️  NO VALID DAY ENTRIES PARSED');
    }

    console.log('\n✅ SUMMARY:');
    console.log(`   Raw OCR lines: ${result.length}`);
    console.log(`   Parsed entries: ${entries.length}`);

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.log(error.stack);
  }
}

async function main() {
  console.log('OCR TEST SCRIPT - Diagnostic Output for 4 Test Images');
  console.log('Models:', MODELS);

  // Check models exist
  const missingModels = [];
  if (!existsSync(MODELS.detPath)) missingModels.push('Detection model: ' + MODELS.detPath);
  if (!existsSync(MODELS.recPath)) missingModels.push('Recognition model: ' + MODELS.recPath);
  if (!existsSync(MODELS.dictPath)) missingModels.push('Dictionary: ' + MODELS.dictPath);

  if (missingModels.length > 0) {
    console.error('\n❌ MISSING MODELS:');
    missingModels.forEach(m => console.error('   - ' + m));
    process.exit(1);
  }

  // Initialize OCR
  console.log('\nInitializing OCR engine...');
  const ocrInstance = await Ocr.create({
    models: {
      detectionPath: MODELS.detPath,
      recognitionPath: MODELS.recPath,
      dictionaryPath: MODELS.dictPath,
    },
  });
  console.log('OCR engine ready.\n');

  // Test each image
  for (const imagePath of TEST_IMAGES) {
    await testOcrOnImage(imagePath, ocrInstance);
  }

  console.log('\n' + '='.repeat(80));
  console.log('ALL TESTS COMPLETE');
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
