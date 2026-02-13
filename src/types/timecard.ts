export type DayType = 'normal' | 'rest' | 'publicHoliday';

export interface DayEntry {
  date: string;
  dayType: DayType;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  extraOtHours?: number;
  restDayInitiator?: 'employer' | 'employee'; // defaults to 'employer' if not set
}

export interface TimeCard {
  entries: DayEntry[];
}
