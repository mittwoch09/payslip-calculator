/**
 * Test Tesseract.js with digit-optimized config vs PaddleOCR baseline.
 * Tesseract with PSM 6 (uniform block) + digit whitelist should handle
 * handwritten numbers better than general-purpose PaddleOCR English models.
 */
import Tesseract from 'tesseract.js';
import path from 'path';

const TEST_IMAGES = [
  '/Users/jun/project/timecard_test_image_01.png',
  '/Users/jun/project/timecard_test_image_02.jpg',
  '/Users/jun/project/timecard_test_image_03.jpg',
  '/Users/jun/project/timecard_test_image_04.jpg',
];

console.log('Initializing Tesseract.js worker...');
const worker = await Tesseract.createWorker('eng');

// Test with default settings first
for (const imagePath of TEST_IMAGES) {
  console.log('='.repeat(80));
  console.log(`IMAGE: ${path.basename(imagePath)}`);
  console.log('='.repeat(80));

  // Default mode (PSM 3 - fully automatic)
  console.log('\n📄 Tesseract DEFAULT (PSM 3):');
  await worker.setParameters({ tessedit_pageseg_mode: '3', tessedit_char_whitelist: '' });
  const r1 = await worker.recognize(imagePath);
  const lines1 = r1.data.text.split('\n').filter(l => l.trim());
  for (const line of lines1) {
    console.log(`  "${line}"`);
  }

  // Digit-optimized mode (PSM 6 + digit whitelist)
  console.log('\n🔢 Tesseract DIGIT-OPTIMIZED (PSM 6, digits+space+OFF):');
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
    tessedit_char_whitelist: '0123456789 :.-/OFfAaPpMm+\n',
  });
  const r2 = await worker.recognize(imagePath);
  const lines2 = r2.data.text.split('\n').filter(l => l.trim());
  for (const line of lines2) {
    console.log(`  "${line}"`);
  }

  console.log('');
}

await worker.terminate();
console.log('Done.');
