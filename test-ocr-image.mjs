import { createWorker } from 'tesseract.js';
import { readFileSync } from 'fs';
import { parseTimecardText } from './src/ocr/timecard-parser.ts';

const imagePath = '/Users/jun/project/timecard_test_image.png';

console.log('Running Tesseract OCR on:', imagePath);
console.log('---');

const worker = await createWorker(['eng', 'chi_sim'], undefined, {
  logger: (m) => {
    if (m.status === 'recognizing text') {
      process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
    }
  },
});

const { data: { text } } = await worker.recognize(imagePath);
await worker.terminate();

console.log('\n\n=== RAW OCR TEXT ===');
console.log(text);
console.log('\n=== PARSED ENTRIES ===');

// We need to use the parser - but it's TypeScript, so let's just do inline parsing
const lines = text.split('\n').filter(l => l.trim().length > 0);
console.log(`Total non-empty lines: ${lines.length}`);
console.log();

// Extract year/month
let year = new Date().getFullYear();
let month = new Date().getMonth() + 1;
const yearMatch = text.match(/\b(20\d{2})\b/);
if (yearMatch) year = parseInt(yearMatch[1]);
const monthNames = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
for (const [name, num] of Object.entries(monthNames)) {
  if (text.toLowerCase().includes(name)) { month = num; break; }
}
console.log(`Detected year: ${year}, month: ${month}`);
console.log();

// Try parsing each line
let found = 0;
for (const line of lines) {
  if (/\bOFF\b/i.test(line)) {
    console.log(`  [OFF] ${line.trim()}`);
    continue;
  }
  const match = line.match(/^\s*(\d{1,2})\s+.*?(\d{4})\s*[|\s]\s*(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    if (day >= 1 && day <= 31) {
      found++;
      console.log(`  [DAY ${day.toString().padStart(2)}] ${match[2]} - ${match[3]}  (raw: "${line.trim()}")`);
    }
  }
}
console.log(`\nTotal entries found: ${found}`);
