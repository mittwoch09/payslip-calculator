import type { PayslipResult } from '../types/payslip';

interface ExportData {
  result: PayslipResult;
  employeeName: string;
  employerName: string;
  periodStart: string;
  periodEnd: string;
  monthlySalary: number;
  hourlyRate: number;
  otRate: number;
}

export function renderPayslipToCanvas(data: ExportData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const W = 800;
  const PADDING = 40;
  const LINE_H = 28;
  const SECTION_GAP = 20;

  // Pre-calculate height
  let lines = 0;
  lines += 5; // header (title, employee, employer, period, rates)
  lines += 1; // separator
  lines += 1; // Basic Pay
  if (data.result.regularOtPay > 0) lines += 1;
  if (data.result.restDayPay > 0) lines += 1;
  if (data.result.publicHolidayPay > 0) lines += 1;
  lines += data.result.allowanceBreakdown.length;
  lines += 2; // separator + gross
  if (data.result.totalDeductions > 0) {
    lines += 1; // deductions header
    lines += data.result.deductionBreakdown.length;
    lines += 2; // separator + total deductions
  }
  lines += 2; // separator + net pay
  lines += 2; // separator + breakdown header
  lines += data.result.dayBreakdown.length;
  lines += 1; // footer

  const H = PADDING * 2 + lines * LINE_H + 6 * SECTION_GAP;
  canvas.width = W;
  canvas.height = H;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  let y = PADDING;
  const LEFT = PADDING;
  const RIGHT = W - PADDING;

  function drawLine(label: string, value: string, bold = false) {
    ctx.font = bold ? 'bold 16px sans-serif' : '14px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(label, LEFT, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, RIGHT, y);
    y += LINE_H;
  }

  function drawSeparator() {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT, y - 10);
    ctx.lineTo(RIGHT, y - 10);
    ctx.stroke();
    y += 4;
  }

  // Title
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#1d4ed8';
  ctx.textAlign = 'left';
  ctx.fillText('Payslip Estimate', LEFT, y);
  y += LINE_H + 8;

  // Header info
  drawLine('Employee', data.employeeName || '-');
  drawLine('Employer', data.employerName || '-');
  drawLine('Period', `${data.periodStart} to ${data.periodEnd}`);
  drawLine('Hourly Rate / OT Rate', `$${data.hourlyRate.toFixed(2)}/h / $${data.otRate.toFixed(2)}/h`);
  y += SECTION_GAP;
  drawSeparator();

  // Earnings
  drawLine('Basic Pay', `$${data.result.basicPay.toFixed(2)}`);
  if (data.result.regularOtPay > 0)
    drawLine(`Overtime Pay (${data.result.totalOtHours}h)`, `$${data.result.regularOtPay.toFixed(2)}`);
  if (data.result.restDayPay > 0)
    drawLine('Rest Day Pay', `$${data.result.restDayPay.toFixed(2)}`);
  if (data.result.publicHolidayPay > 0)
    drawLine('Public Holiday Pay', `$${data.result.publicHolidayPay.toFixed(2)}`);
  for (const a of data.result.allowanceBreakdown)
    drawLine(a.label, `$${a.amount.toFixed(2)}`);
  drawSeparator();
  drawLine('Gross Pay', `$${data.result.grossPay.toFixed(2)}`, true);
  y += SECTION_GAP;

  // Deductions
  if (data.result.totalDeductions > 0) {
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'left';
    ctx.fillText('Deductions', LEFT, y);
    y += LINE_H;
    for (const d of data.result.deductionBreakdown)
      drawLine(d.label, `-$${d.amount.toFixed(2)}`);
    drawSeparator();
    drawLine('Total Deductions', `-$${data.result.totalDeductions.toFixed(2)}`, true);
    y += SECTION_GAP;
  }

  // Net Pay
  drawSeparator();
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#059669';
  ctx.textAlign = 'left';
  ctx.fillText('Net Pay', LEFT, y);
  ctx.textAlign = 'right';
  ctx.fillText(`$${data.result.netPay.toFixed(2)}`, RIGHT, y);
  y += LINE_H + SECTION_GAP;

  // Day breakdown
  drawSeparator();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('Daily Breakdown', LEFT, y);
  y += LINE_H;

  ctx.font = '12px sans-serif';
  for (const day of data.result.dayBreakdown) {
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(`${day.date} - ${day.description}`, LEFT, y);
    ctx.textAlign = 'right';
    ctx.fillText(`$${day.totalDayPay.toFixed(2)}`, RIGHT, y);
    y += LINE_H;
  }

  return canvas;
}

export function downloadPayslipImage(data: ExportData): void {
  const canvas = renderPayslipToCanvas(data);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${data.periodStart}-${data.periodEnd}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
