import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getMockRate, BANK_TRANSFER_BENCHMARK } from '../../lib/rate-calculator';
import { providers } from '../../data/providers';
import { corridors } from '../../data/corridors';

interface SalaryToRemittanceWidgetProps {
  corridorId: string;
  onAmountCalculated: (amount: number) => void;
}

export default function SalaryToRemittanceWidget({
  corridorId,
  onAmountCalculated,
}: SalaryToRemittanceWidgetProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('');

  const corridor = corridors.find(c => c.id === corridorId);
  const targetCurrency = corridor?.target || 'BDT';
  const countryName = corridor?.country || '';

  const sendAmount = Number(amount) || 0;

  const result = useMemo(() => {
    if (sendAmount <= 0) return null;

    const midRate = getMockRate(corridorId);

    // Find best provider receive amount
    let bestReceive = -Infinity;

    for (const provider of providers) {
      const feeStruct = provider.fees[corridorId] || { fixed: 0, percent: 0 };
      const fee = feeStruct.fixed + sendAmount * feeStruct.percent;
      const rate = midRate * (1 - provider.rateMargin);
      const receive = Math.floor((sendAmount - fee) * rate);
      if (receive > bestReceive) {
        bestReceive = receive;
      }
    }

    // Bank benchmark
    const bankFee = BANK_TRANSFER_BENCHMARK.fixed + sendAmount * BANK_TRANSFER_BENCHMARK.percent;
    const bankRate = midRate * (1 - BANK_TRANSFER_BENCHMARK.rateMargin);
    const bankReceive = Math.floor((sendAmount - bankFee) * bankRate);

    const savings = Math.max(0, bestReceive - bankReceive);

    return { bestReceive, savings };
  }, [sendAmount, corridorId]);

  return (
    <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_black]">
      <h3 className="text-lg font-black text-black mb-3">
        {t('remittanceCalc.title')}
      </h3>

      <div>
        <label className="block text-sm font-bold text-black mb-1">
          {t('remittanceCalc.amount')}
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="e.g. 1200"
          className="w-full border-2 border-black px-3 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {result && result.bestReceive > 0 ? (
        <div className="mt-4 space-y-2">
          <div className="bg-green-50 border-2 border-black p-3">
            <div className="text-sm text-gray-600">
              {t('remittanceCalc.recipientGets', { country: countryName })}
            </div>
            <div className="text-2xl font-black text-black">
              {targetCurrency} {result.bestReceive.toLocaleString()}
            </div>
            {result.savings > 0 && (
              <div className="text-sm font-bold text-green-700 mt-1">
                {t('remittanceCalc.savings', {
                  currency: targetCurrency,
                  amount: result.savings.toLocaleString(),
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => onAmountCalculated(sendAmount)}
            className="w-full bg-black text-white font-black py-3 px-4 border-2 border-black shadow-[4px_4px_0_#555] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
          >
            {t('remittanceCalc.useAmount')}
          </button>
        </div>
      ) : (
        !amount && (
          <div className="mt-3 text-sm text-gray-500 italic">
            {t('remittanceCalc.enterSalary')}
          </div>
        )
      )}
    </div>
  );
}
