import { useState, useCallback } from 'react';
import type { DayEntry, DayType } from '../types/timecard';
import type { TimecardPreviewRow } from '../ocr/timecard-parser';
import { getSgPublicHolidays, autoDayType } from '../engine/constants';

export interface EditableRow {
  date: string;
  clockIn: string;
  clockOut: string;
  isOff: boolean;
  dayType: DayType;
  plusOne: boolean;
  ocrPlusOne: boolean;
  ocrRawIn: string;
  ocrRawOut: string;
  breakMinutes: number;
  extraOtHours?: number;
}

function formatRawTime(raw: string): string {
  if (raw.includes(':')) return raw;
  if (/^\d{4}$/.test(raw)) return `${raw.slice(0, 2)}:${raw.slice(2)}`;
  return raw;
}

function derivePlusOne(clockIn: string, clockOut: string): boolean {
  return clockOut !== '' && clockIn !== '' && clockOut < clockIn;
}

function buildRows(entries: DayEntry[], previewRows: TimecardPreviewRow[], year?: number): EditableRow[] {
  const ph = getSgPublicHolidays(year ?? new Date().getFullYear());

  // Use previewRows as the base (includes all days of the month)
  return previewRows.map(pr => {
    const entry = entries.find(e => e.date === pr.date);
    const clockIn = entry?.clockIn ?? formatRawTime(pr.timeInRaw);
    const clockOut = entry?.clockOut ?? formatRawTime(pr.timeOutRaw);
    const calendarType = autoDayType(pr.date, ph);

    return {
      date: pr.date,
      clockIn: pr.isOff ? '' : clockIn,
      clockOut: pr.isOff ? '' : clockOut,
      isOff: pr.isOff,
      dayType: pr.isOff ? 'rest' : calendarType,
      plusOne: pr.plusOne || derivePlusOne(clockIn, clockOut),
      ocrPlusOne: pr.plusOne || (entry?.extraOtHours !== undefined && entry.extraOtHours > 0),
      ocrRawIn: pr.timeInRaw,
      ocrRawOut: pr.timeOutRaw,
      breakMinutes: entry?.breakMinutes ?? 60,
      extraOtHours: entry?.extraOtHours,
    };
  });
}

export function useEditableTimecard(initialEntries: DayEntry[], previewRows: TimecardPreviewRow[], year?: number) {
  const [rows, setRows] = useState<EditableRow[]>(() => buildRows(initialEntries, previewRows, year));

  const updateTime = useCallback((index: number, field: 'clockIn' | 'clockOut', value: string) => {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[index] };
      row[field] = value;
      row.plusOne = derivePlusOne(row.clockIn, row.clockOut);
      next[index] = row;
      return next;
    });
  }, []);

  const toggleOff = useCallback((index: number) => {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[index] };
      if (row.isOff) {
        // Restore: use OCR raw values or defaults
        row.isOff = false;
        row.dayType = 'normal';
        row.clockIn = formatRawTime(row.ocrRawIn) || '07:00';
        row.clockOut = formatRawTime(row.ocrRawOut) || '19:00';
        row.plusOne = derivePlusOne(row.clockIn, row.clockOut);
      } else {
        row.isOff = true;
        row.dayType = 'rest';
        row.clockIn = '';
        row.clockOut = '';
        row.plusOne = false;
        row.extraOtHours = undefined;
      }
      next[index] = row;
      return next;
    });
  }, []);

  const setDayType = useCallback((index: number, type: DayType) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], dayType: type };
      return next;
    });
  }, []);

  const updateExtraOt = useCallback((index: number, value: number | undefined) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], extraOtHours: value };
      return next;
    });
  }, []);

  const getEntries = useCallback((): DayEntry[] => {
    return rows
      .filter(r => !r.isOff && r.clockIn && r.clockOut)
      .map(r => ({
        date: r.date,
        dayType: r.dayType,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        breakMinutes: r.breakMinutes,
        ...(r.extraOtHours !== undefined ? { extraOtHours: r.extraOtHours } : {}),
      }));
  }, [rows]);

  return { rows, updateTime, toggleOff, setDayType, updateExtraOt, getEntries };
}
