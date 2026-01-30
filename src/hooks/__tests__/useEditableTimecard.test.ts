// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditableTimecard } from '../useEditableTimecard';
import type { DayEntry } from '../../types/timecard';
import type { TimecardPreviewRow } from '../../ocr/timecard-parser';

function makePreviewRow(overrides: Partial<TimecardPreviewRow> = {}): TimecardPreviewRow {
  return {
    date: '2025-11-01',
    timeInRaw: '0700',
    timeOutRaw: '1900',
    isOff: false,
    plusOne: false,
    ...overrides,
  };
}

describe('useEditableTimecard', () => {
  it('initializes rows from preview data', () => {
    const rows = [makePreviewRow(), makePreviewRow({ date: '2025-11-02', isOff: true })];
    const { result } = renderHook(() => useEditableTimecard([], rows));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].clockIn).toBe('07:00');
    expect(result.current.rows[0].clockOut).toBe('19:00');
    expect(result.current.rows[0].isOff).toBe(false);
    expect(result.current.rows[1].isOff).toBe(true);
    expect(result.current.rows[1].clockIn).toBe('');
  });

  it('prefers entry data over preview raw times', () => {
    const preview = [makePreviewRow({ date: '2025-11-01', timeInRaw: '0700', timeOutRaw: '1900' })];
    const entries: DayEntry[] = [{ date: '2025-11-01', clockIn: '08:00', clockOut: '18:00', dayType: 'normal', breakMinutes: 60 }];
    const { result } = renderHook(() => useEditableTimecard(entries, preview));

    expect(result.current.rows[0].clockIn).toBe('08:00');
    expect(result.current.rows[0].clockOut).toBe('18:00');
  });

  it('derives plusOne when clockOut < clockIn', () => {
    const preview = [makePreviewRow({ timeInRaw: '1900', timeOutRaw: '0700' })];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    expect(result.current.rows[0].plusOne).toBe(true);
  });

  it('updateTime changes time and recalculates plusOne', () => {
    const preview = [makePreviewRow()];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    act(() => result.current.updateTime(0, 'clockOut', '05:00'));

    expect(result.current.rows[0].clockOut).toBe('05:00');
    expect(result.current.rows[0].plusOne).toBe(true);
  });

  it('toggleOff switches row to off state', () => {
    const preview = [makePreviewRow()];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    act(() => result.current.toggleOff(0));

    expect(result.current.rows[0].isOff).toBe(true);
    expect(result.current.rows[0].clockIn).toBe('');
    expect(result.current.rows[0].dayType).toBe('rest');
  });

  it('toggleOff restores OCR times when turning off→on', () => {
    const preview = [makePreviewRow({ isOff: true, timeInRaw: '0800', timeOutRaw: '2000' })];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    expect(result.current.rows[0].isOff).toBe(true);

    act(() => result.current.toggleOff(0));

    expect(result.current.rows[0].isOff).toBe(false);
    expect(result.current.rows[0].clockIn).toBe('08:00');
    expect(result.current.rows[0].clockOut).toBe('20:00');
    expect(result.current.rows[0].dayType).toBe('normal');
  });

  it('setDayType changes day type', () => {
    const preview = [makePreviewRow()];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    act(() => result.current.setDayType(0, 'publicHoliday'));

    expect(result.current.rows[0].dayType).toBe('publicHoliday');
  });

  it('getEntries filters out off-days and empty rows', () => {
    const preview = [
      makePreviewRow({ date: '2025-11-01' }),
      makePreviewRow({ date: '2025-11-02', isOff: true }),
      makePreviewRow({ date: '2025-11-03', timeInRaw: '', timeOutRaw: '' }),
    ];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    const entries = result.current.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe('2025-11-01');
    expect(entries[0].clockIn).toBe('07:00');
  });

  it('preserves ocrPlusOne independently from plusOne after editing', () => {
    const preview = [makePreviewRow({ plusOne: true, timeInRaw: '0700', timeOutRaw: '1900' })];
    const entries: DayEntry[] = [{ date: '2025-11-01', clockIn: '07:00', clockOut: '19:00', dayType: 'normal', breakMinutes: 60, extraOtHours: 1 }];
    const { result } = renderHook(() => useEditableTimecard(entries, preview));

    // Both should be true initially
    expect(result.current.rows[0].ocrPlusOne).toBe(true);
    expect(result.current.rows[0].plusOne).toBe(true);
    expect(result.current.rows[0].extraOtHours).toBe(1);

    // Edit clockOut to a value > clockIn — plusOne should become false, ocrPlusOne stays true
    act(() => result.current.updateTime(0, 'clockOut', '20:00'));
    expect(result.current.rows[0].plusOne).toBe(false);
    expect(result.current.rows[0].ocrPlusOne).toBe(true);
    expect(result.current.rows[0].extraOtHours).toBe(1);
  });

  it('updateExtraOt toggles extra OT hours', () => {
    const preview = [makePreviewRow({ plusOne: true })];
    const entries: DayEntry[] = [{ date: '2025-11-01', clockIn: '07:00', clockOut: '19:00', dayType: 'normal', breakMinutes: 60, extraOtHours: 1 }];
    const { result } = renderHook(() => useEditableTimecard(entries, preview));

    expect(result.current.rows[0].extraOtHours).toBe(1);

    // Toggle off
    act(() => result.current.updateExtraOt(0, undefined));
    expect(result.current.rows[0].extraOtHours).toBeUndefined();

    // Toggle back on
    act(() => result.current.updateExtraOt(0, 1));
    expect(result.current.rows[0].extraOtHours).toBe(1);
  });

  it('formats raw 4-digit times with colon', () => {
    const preview = [makePreviewRow({ timeInRaw: '0830', timeOutRaw: '17:30' })];
    const { result } = renderHook(() => useEditableTimecard([], preview));

    expect(result.current.rows[0].clockIn).toBe('08:30');
    expect(result.current.rows[0].clockOut).toBe('17:30');
  });
});
