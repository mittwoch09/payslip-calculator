import { useTranslation } from 'react-i18next';
import type { PayslipResult } from '../types/payslip';

interface PayslipDisplayProps {
  result: PayslipResult;
  employeeName: string;
  employerName: string;
  periodStart: string;
  periodEnd: string;
}

function Row({ label, amount, bold, large }: { label: string; amount: number; bold?: boolean; large?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1 ${bold ? 'font-bold' : ''} ${large ? 'text-xl' : ''}`}>
      <span className="text-slate-300">{label}</span>
      <span className={large ? 'text-emerald-400' : ''}>${amount.toFixed(2)}</span>
    </div>
  );
}

export default function PayslipDisplay({ result, employeeName, employerName, periodStart, periodEnd }: PayslipDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-xl p-3 space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-yellow-300 text-sm">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h2 className="text-lg font-bold text-blue-400 mb-2">{t('payslip.title')}</h2>
        <div className="text-sm text-slate-400 space-y-1">
          <p>{t('payslip.employee')}: <span className="text-white">{employeeName || '-'}</span></p>
          <p>{t('payslip.employer')}: <span className="text-white">{employerName || '-'}</span></p>
          <p>{t('payslip.period')}: <span className="text-white">{periodStart} to {periodEnd}</span></p>
        </div>
      </div>

      {/* Earnings */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-1">
        <Row label={t('payslip.basicPay')} amount={result.basicPay} />
        {result.regularOtPay > 0 && (
          <Row label={`${t('payslip.otPay')} (${result.totalOtHours}h)`} amount={result.regularOtPay} />
        )}
        {result.restDayPay > 0 && (
          <Row label={t('payslip.restDayPay')} amount={result.restDayPay} />
        )}
        {result.publicHolidayPay > 0 && (
          <Row label={t('payslip.publicHolidayPay')} amount={result.publicHolidayPay} />
        )}
        {result.allowanceBreakdown.map((a, i) => (
          <Row key={i} label={a.label} amount={a.amount} />
        ))}
        <div className="border-t border-slate-700 mt-2 pt-2">
          <Row label={t('payslip.grossPay')} amount={result.grossPay} bold />
        </div>
      </div>

      {/* Deductions */}
      {result.totalDeductions > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-1">
          <h3 className="text-sm font-semibold text-red-400 mb-1">{t('payslip.totalDeductions')}</h3>
          {result.deductionBreakdown.map((d, i) => (
            <Row key={i} label={d.label} amount={-d.amount} />
          ))}
          <div className="border-t border-slate-700 mt-2 pt-2">
            <Row label={t('payslip.totalDeductions')} amount={-result.totalDeductions} bold />
          </div>
        </div>
      )}

      {/* Net Pay */}
      <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4">
        <Row label={t('payslip.netPay')} amount={result.netPay} bold large />
      </div>

      {/* Day breakdown */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-2">{t('payslip.breakdown')}</h3>
        <div className="space-y-2">
          {result.dayBreakdown.map((day, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <span className="text-slate-300">{day.date}</span>
                <span className="text-slate-500 ml-2">{day.description}</span>
              </div>
              <span>${day.totalDayPay.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-slate-500 text-xs text-center">{t('app.disclaimer')}</p>
    </div>
  );
}
