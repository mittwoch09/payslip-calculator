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
    <div className={`flex justify-between items-center py-2 gap-4 ${bold ? 'font-bold text-lg' : ''} ${large ? 'text-3xl min-h-16' : 'text-base'}`}>
      <span className="text-slate-200">{label}</span>
      <span className={`${large ? 'text-emerald-400 font-black' : 'font-bold'} shrink-0`}>${amount.toFixed(2)}</span>
    </div>
  );
}

export default function PayslipDisplay({ result, employeeName, employerName, periodStart, periodEnd }: PayslipDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-xl p-4 space-y-2">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-yellow-200 font-medium">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h2 className="text-2xl font-black text-blue-400 mb-3">{t('payslip.title')}</h2>
        <div className="text-base text-slate-300 space-y-1">
          <p>{t('payslip.employee')}: <span className="text-white font-bold">{employeeName || '-'}</span></p>
          <p>{t('payslip.employer')}: <span className="text-white font-bold">{employerName || '-'}</span></p>
          <p>{t('payslip.period')}: <span className="text-white font-bold">{periodStart} to {periodEnd}</span></p>
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
        <div className="border-t-2 border-slate-700 mt-3 pt-3">
          <Row label={t('payslip.grossPay')} amount={result.grossPay} bold />
        </div>
      </div>

      {/* Deductions */}
      {result.totalDeductions > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-1">
          <h3 className="font-bold text-red-400 mb-2 text-lg">{t('payslip.totalDeductions')}</h3>
          {result.deductionBreakdown.map((d, i) => (
            <Row key={i} label={d.label} amount={-d.amount} />
          ))}
          <div className="border-t-2 border-slate-700 mt-3 pt-3">
            <Row label={t('payslip.totalDeductions')} amount={-result.totalDeductions} bold />
          </div>
        </div>
      )}

      {/* Net Pay */}
      <div className="bg-emerald-900/40 border-2 border-emerald-600 rounded-xl p-6">
        <Row label={t('payslip.netPay')} amount={result.netPay} bold large />
      </div>

      {/* Day breakdown */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="font-bold text-slate-300 mb-3 text-base">{t('payslip.breakdown')}</h3>
        <div className="space-y-3">
          {result.dayBreakdown.map((day, i) => (
            <div key={i} className="flex justify-between text-base gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 font-bold">{day.date}</div>
                <div className="text-slate-400 text-sm truncate">{day.description}</div>
              </div>
              <span className="font-bold text-white shrink-0">${day.totalDayPay.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-slate-500 text-sm text-center leading-relaxed">{t('app.disclaimer')}</p>
    </div>
  );
}
