/**
 * OCR post-processing: fix common PaddleOCR misreads on English timecard data.
 *
 * Known misread patterns from PP-OCRv4 on handwritten timecards:
 *   D → 0, O → 0, g → 9, I/l → 1, B → 8, S → 5
 *   Slashes/pipes inside digit runs: 19/0 → 1900
 *   Fragment splits: "070 1900" → "0700 1900"
 */

// Letters commonly confused with digits in OCR
const LETTER_TO_DIGIT: Record<string, string> = {
  D: '0',
  O: '0',
  o: '0',
  g: '9',
  q: '9',
  I: '1',
  l: '1',
  B: '8',
  S: '5',
  s: '5',
  Z: '2',
  z: '2',
  e: '0',
  w: '0',
  W: '0',
  t: '1',
  T: '1',
  n: '0',
  m: '0',
  U: '0',
  u: '0',
  r: '1',
  R: '1',
  f: '7',
  F: '7',
};

/** Replace OCR-confused letters with digits when surrounded by digit context */
function fixLettersInDigitContext(text: string): string {
  // Run multiple passes to catch cascading fixes (e.g., D7w190 → 07w190 → 070190)
  let result = text;
  for (let i = 0; i < 3; i++) {
    const prev = result;
    result = result.replace(/(\d)([A-Za-z])(\d)/g, (_match, before, letter, after) => {
      const replacement = LETTER_TO_DIGIT[letter];
      return replacement ? `${before}${replacement}${after}` : `${before}${letter}${after}`;
    }).replace(/([A-Za-z])(\d+)/g, (_match, letter, digits) => {
      // Letter followed by any digits (e.g., D7 → 07, D70 → 070)
      const replacement = LETTER_TO_DIGIT[letter];
      return replacement ? `${replacement}${digits}` : `${letter}${digits}`;
    }).replace(/(\d+)([A-Za-z])/g, (_match, digits, letter) => {
      // Digits followed by letter (e.g., 07D → 070, 070D → 0700)
      const replacement = LETTER_TO_DIGIT[letter];
      return replacement ? `${digits}${replacement}` : `${digits}${letter}`;
    });
    if (result === prev) break;
  }
  return result;
}

/** Replace stray punctuation in digit sequences with 0 (OCR misread): 19/0 → 1900
 *  Only when surrounded by 2+ digits on at least one side (avoids date separators like 01/11) */
function fixPunctuationInDigits(text: string): string {
  // Slash/pipe between digits where only 1 digit follows: replace slash with 0 (e.g., "19/0" → "1900")
  text = text.replace(/(\d{2,})[/|\\](\d)(?!\d)/g, '$10$2');
  // Slash/pipe in long digit runs (4+ digits on one side): remove it (e.g., "0700/900" → "0700900")
  // Avoid date patterns like "01/11" by requiring at least 3 digits on one side
  text = text.replace(/(\d{3,})[/|\\](\d+)/g, '$1$2');
  text = text.replace(/(\d+)[/|\\](\d{3,})/g, '$1$2');
  return text;
}

/** Normalize OFF variants: OfF, 0FF, oFF → OFF */
function normalizeOff(text: string): string {
  return text.replace(/\b[0Oo][Ff][Ff]\b/g, 'OFF');
}

/**
 * Try to rejoin fragmented time tokens.
 * E.g., "070 1900" → if 070 is 3 digits followed by space + 4 digits,
 * check if we can form two valid 4-digit times: "0701900" → "0700 1900" or "0701 900"
 * Also handles: "0701900" (7 digits merged) → "0700 1900" heuristic
 */
function rejoinTimeFragments(text: string): string {
  // Pattern: two 3-digit tokens — both might be truncated 4-digit times
  // e.g., "070 900" → pad both → "0700 9000" → validate → if first valid, keep
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

  // Pattern: 4-digit token + 3-digit token (e.g., "0700 190" → "0700 1900")
  text = text.replace(/\b(\d{4})\s+(\d{3})\b/g, (_match, four, three) => {
    const padded = three + '0';
    if (isValidTime4(four) && isValidTime4(padded)) {
      return `${four} ${padded}`;
    }
    return `${four} ${three}`;
  });

  // Pattern: 3-digit token followed by space(s) and a 4-digit token
  // e.g., "070 1900" — likely "0700 1900" with the trailing 0 merged into next
  text = text.replace(/\b(\d{3})\s+(\d{4})\b/g, (_match, three, four) => {
    // Try: the 3-digit is missing its last digit (0), forming a 4-digit time
    // Heuristic: pad 3-digit with 0 → check if valid time
    const padded = three + '0';
    if (isValidTime4(padded) && isValidTime4(four)) {
      return `${padded} ${four}`;
    }
    return `${three} ${four}`;
  });

  // Pattern: 6 consecutive digits like "070190" → split into "0700 1900" or "0701 90"
  text = text.replace(/\b(\d{6})\b/g, (_match, six) => {
    // Try split 3+3: "070" + "190" → pad both → "0700" + "1900"
    const a3 = six.substring(0, 3) + '0';
    const b3 = six.substring(3) + '0';
    if (isValidTime4(a3) && isValidTime4(b3)) {
      return `${a3} ${b3}`;
    }
    // Try split 4+2: "0701" + "90" → pad second → "0701" + "9000" (probably invalid)
    const first4 = six.substring(0, 4);
    const last2 = six.substring(4) + '00';
    if (isValidTime4(first4) && isValidTime4(last2)) {
      return `${first4} ${last2}`;
    }
    // Try split 2+4: "07" + "0190" → pad first → "0700" + "0190"
    const first2 = six.substring(0, 2) + '00';
    const last4 = six.substring(2);
    if (isValidTime4(first2) && isValidTime4(last4)) {
      return `${first2} ${last4}`;
    }
    return six;
  });

  // Pattern: 7 consecutive digits like "0701900" → split into "0700 1900" or "0701 900"
  text = text.replace(/\b(\d{7})\b/g, (_match, seven) => {
    // Try split at position 4: "0701" + "900" — not great
    // Try split at position 3: "070" + "1900" — pad first to "0700"
    const first3 = seven.substring(0, 3) + '0';
    const last4 = seven.substring(3);
    if (isValidTime4(first3) && isValidTime4(last4)) {
      return `${first3} ${last4}`;
    }
    // Try split at position 4
    const first4 = seven.substring(0, 4);
    const last3 = seven.substring(4) + '0';
    if (isValidTime4(first4) && isValidTime4(last3)) {
      return `${first4} ${last3}`;
    }
    return seven;
  });

  // Pattern: 8 consecutive digits like "07001900" → "0700 1900"
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

/** Check if a 4-digit string represents a valid time (HH00-HH59, HH=00-23) */
function isValidTime4(s: string): boolean {
  if (s.length !== 4) return false;
  const hour = parseInt(s.substring(0, 2));
  const minute = parseInt(s.substring(2, 4));
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** Fix common handwriting-to-digit misreads that only occur in specific positions */
function fixHandwritingDigits(text: string): string {
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

/** Split merged day number + time digits: "2707301930" → "27 0730 1930" */
function splitMergedDayDigits(text: string): string {
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

/**
 * Normalize OCR misreads of "+1" marker.
 * Common OCR errors: "+" → "t"/"T"/"f"/"F", "1" → "3"/"l"/"I"/"i"/"|"
 * Pattern appears after time digits, e.g. "0700 1900 t 3" should be "0700 1900 +1"
 */
function normalizePlusOne(text: string): string {
  // Match isolated single char (t/T/f/F/+) + optional space + single char (1/3/l/I/i/|)
  // after digit context (preceded by digit or space-after-digit) and before space/end/digit
  return text.replace(
    /(\d{3,})\s+([tTfF+])\s*([1l3Ii|])(?=\s|$)/g,
    '$1 +1'
  );
}

/**
 * Apply all OCR corrections to a single line of text.
 */
export function correctOcrLine(raw: string): string {
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
