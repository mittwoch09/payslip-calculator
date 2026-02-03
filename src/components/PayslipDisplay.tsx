import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayslipResult } from '../types/payslip';
import { calcHourlyRate } from '../engine/calculator';
import { OT_MULTIPLIER } from '../engine/constants';
import { downloadPayslipImage } from '../utils/export';
import ScrollButtons from './ScrollButtons';
import RemittanceCTA from './remittance/RemittanceCTA';
import '../styles/print.css';

interface PayslipDisplayProps {
  result: PayslipResult;
  employeeName: string;
  employerName: string;
  periodStart: string;
  periodEnd: string;
  monthlySalary: number;
  hourlyRate?: number;
  otRate?: number;
  onNavigateRemittance?: (amount: number) => void;
}

function Row({ label, amount, bold, large }: { label: string; amount: number; bold?: boolean; large?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 gap-4 ${bold ? 'font-bold text-lg' : ''} ${large ? 'text-3xl min-h-16' : 'text-base'}`}>
      <span className="text-black truncate">{label}</span>
      <span className={`${large ? 'text-black font-black' : 'font-bold text-black'} shrink-0`}>${amount.toFixed(2)}</span>
    </div>
  );
}

export default function PayslipDisplay({ result, employeeName, employerName, periodStart, periodEnd, monthlySalary, hourlyRate: propsHourlyRate, otRate: propsOtRate, onNavigateRemittance }: PayslipDisplayProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const hourlyRate = propsHourlyRate ?? calcHourlyRate(monthlySalary);
  const otRate = propsOtRate ?? (hourlyRate * OT_MULTIPLIER);

  return (
    <div className="space-y-3">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="no-print bg-amber-100 border-2 border-black px-3 py-2 space-y-0.5">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-black text-xs font-bold">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-2 border-black p-3">
        <h2 className="text-2xl font-black text-black mb-3">{t('payslip.title')}</h2>
        <div className="text-base text-gray-600 space-y-1">
          <p>{t('payslip.employee')}: <span className="text-black font-bold">{employeeName || '-'}</span></p>
          <p>{t('payslip.employer')}: <span className="text-black font-bold">{employerName || '-'}</span></p>
          <p>{t('payslip.period')}: <span className="text-black font-bold">{periodStart} to {periodEnd}</span></p>
        </div>
        <div className="mt-3 pt-3 border-t-2 border-black grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">{t('payslip.hourlyRate')}</p>
            <p className="text-black font-bold text-base">${hourlyRate.toFixed(2)}/h</p>
          </div>
          <div>
            <p className="text-gray-500">{t('payslip.otRate')}</p>
            <p className="text-black font-bold text-base">${otRate.toFixed(2)}/h</p>
          </div>
        </div>
      </div>

      {/* Earnings */}
      <div className="bg-white border-2 border-black p-4 space-y-1">
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
        <div className="border-t-2 border-black mt-3 pt-3">
          <Row label={t('payslip.grossPay')} amount={result.grossPay} bold />
        </div>
      </div>

      {/* Deductions */}
      {result.totalDeductions > 0 && (
        <div className="bg-white border-2 border-black p-4 space-y-1">
          <h3 className="font-bold text-red-600 mb-2 text-lg">{t('payslip.totalDeductions')}</h3>
          {result.deductionBreakdown.map((d, i) => (
            <Row key={i} label={d.label} amount={-d.amount} />
          ))}
          <div className="border-t-2 border-black mt-3 pt-3">
            <Row label={t('payslip.totalDeductions')} amount={-result.totalDeductions} bold />
          </div>
        </div>
      )}

      {/* Net Pay */}
      <div className="bg-lime-200 border-3 border-black p-4 shadow-[4px_4px_0_black]">
        <Row label={t('payslip.netPay')} amount={result.netPay} bold large />
      </div>

      {/* Remittance CTA */}
      {onNavigateRemittance && (
        <div className="no-print">
          <RemittanceCTA
            netPay={result.netPay}
            onCompareRates={() => onNavigateRemittance(result.netPay)}
          />
        </div>
      )}

      {/* Export Buttons */}
      <div className="no-print flex flex-col gap-3">
        <button
          onClick={() => downloadPayslipImage({ result, employeeName, employerName, periodStart, periodEnd, monthlySalary, hourlyRate, otRate })}
          className="w-full px-6 py-3 bg-black text-white border-2 border-black font-bold shadow-[3px_3px_0_#7c3aed] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          {t('payslip.saveImage')}
        </button>
        <button
          onClick={() => window.print()}
          className="w-full px-6 py-3 bg-white text-black border-2 border-black font-bold shadow-[3px_3px_0_black] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          {t('payslip.print')}
        </button>
      </div>

      {/* Day breakdown */}
      <div className="bg-white border-2 border-black p-4">
        <h3 className="font-bold text-black mb-3 text-base">{t('payslip.breakdown')}</h3>
        <div className="space-y-3">
          {result.dayBreakdown.map((day, i) => (
            <div key={i} className="flex justify-between text-base gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold truncate">
                  {day.date} {(() => { const d = new Date(day.date + 'T00:00:00').getDay(); const label = ['Su','Mo','Tu','We','Th','Fr','Sa'][d]; const cls = day.dayType === 'publicHoliday' ? 'text-red-600' : d === 0 ? 'text-orange-600' : d === 6 ? 'text-violet-600' : 'text-gray-400'; return <span className={`font-normal ${cls}`}>({label})</span>; })()}
                </div>
                <div className="text-gray-500 text-sm truncate">{day.description}</div>
              </div>
              <span className="font-bold text-black shrink-0">${day.totalDayPay.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="no-print text-gray-400 text-sm text-center leading-relaxed">{t('app.disclaimer')}</p>
      <div ref={bottomRef} />

      <ScrollButtons bottomRef={bottomRef} />
    </div>
  );
}
