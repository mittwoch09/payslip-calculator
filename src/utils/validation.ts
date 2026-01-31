export interface ValidationError {
  field: string;
  message: string; // i18n key
}

export function validateSalary(monthlySalary: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!monthlySalary || monthlySalary <= 0) {
    errors.push({ field: 'monthlySalary', message: 'validation.salaryRequired' });
  }
  return errors;
}

export function validateEntry(entry: { clockIn: string; clockOut: string; breakMinutes: number; date: string }): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!entry.date) errors.push({ field: 'date', message: 'validation.dateRequired' });
  if (!entry.clockIn) errors.push({ field: 'clockIn', message: 'validation.clockInRequired' });
  if (!entry.clockOut) errors.push({ field: 'clockOut', message: 'validation.clockOutRequired' });
  if (entry.breakMinutes < 0) errors.push({ field: 'breakMinutes', message: 'validation.breakNegative' });

  // Calculate worked minutes to validate break
  if (entry.clockIn && entry.clockOut) {
    const [inH, inM] = entry.clockIn.split(':').map(Number);
    const [outH, outM] = entry.clockOut.split(':').map(Number);
    let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMins < 0) totalMins += 24 * 60; // overnight
    if (entry.breakMinutes >= totalMins) {
      errors.push({ field: 'breakMinutes', message: 'validation.breakExceedsWork' });
    }
  }
  return errors;
}

export function validateEntries(entries: unknown[]): ValidationError[] {
  if (!entries || entries.length === 0) {
    return [{ field: 'entries', message: 'validation.atLeastOneDay' }];
  }
  return [];
}
