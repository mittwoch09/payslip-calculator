import { describe, it, expect } from 'vitest';
import { correctOcrLine } from './ocr-postprocess';

describe('correctOcrLine', () => {
  it('fixes D→0 in digit context', () => {
    expect(correctOcrLine('D70 1900')).toBe('0700 1900');
    expect(correctOcrLine('D710 1900')).toBe('0710 1900');
  });

  it('fixes g→9 in digit context', () => {
    // g→9, but 070 + 900 are both 3-digit (no rejoin)
    expect(correctOcrLine('070 900')).toBe('0700 900');
    expect(correctOcrLine('14 070 g00')).toContain('070');
    expect(correctOcrLine('g00')).toBe('900');
  });

  it('strips slashes from digit sequences', () => {
    expect(correctOcrLine('19/0')).toBe('1900');
    // 03019/0 → fix slash → 0301900 (7 digits) → rejoin → 0300 1900
    expect(correctOcrLine('03019/0')).toBe('0300 1900');
  });

  it('normalizes OFF variants', () => {
    expect(correctOcrLine('OfF')).toBe('OFF');
    expect(correctOcrLine('0FF')).toBe('OFF');
    expect(correctOcrLine('oFF')).toBe('OFF');
  });

  it('rejoins 3-digit + 4-digit fragments', () => {
    expect(correctOcrLine('070 1900')).toBe('0700 1900');
  });

  it('splits 7-digit merged times', () => {
    expect(correctOcrLine('0701900')).toBe('0700 1900');
  });

  it('splits 8-digit merged times', () => {
    expect(correctOcrLine('07001900')).toBe('0700 1900');
  });

  it('handles combined corrections', () => {
    // D70 1900 → fix D→0 → 070 1900 → rejoin → 0700 1900
    expect(correctOcrLine('D70 1900')).toBe('0700 1900');
  });

  it('preserves valid text', () => {
    expect(correctOcrLine('1 0700 1900')).toBe('1 0700 1900');
    expect(correctOcrLine('OFF')).toBe('OFF');
    expect(correctOcrLine('Date Qty Site')).toBe('Date Qty Site');
  });

  it('handles line with day number and times', () => {
    expect(correctOcrLine('15 070 1900')).toBe('15 0700 1900');
  });
});
