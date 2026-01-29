export type DayType = 'normal' | 'rest' | 'publicHoliday';

export interface DayEntry {
  date: string;
  dayType: DayType;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
}

export interface TimeCard {
  entries: DayEntry[];
}
