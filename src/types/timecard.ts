export type DayType = 'normal' | 'rest' | 'publicHoliday';

export interface DayEntry {
  date: string;
  dayType: DayType;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  extraOtHours?: number;
}

export interface TimeCard {
  entries: DayEntry[];
}
