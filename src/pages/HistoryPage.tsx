import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayslipHistory, type HistoryEntry } from '../hooks/usePayslipHistory';
import PayslipDisplay from '../components/PayslipDisplay';

interface HistoryPageProps {
  onBack: () => void;
}

export default function HistoryPage({ onBack }: HistoryPageProps) {
  const { t } = useTranslation();
  const { getEntries, deleteEntry } = usePayslipHistory();
  const [entries, setEntries] = useState<HistoryEntry[]>(getEntries());
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  const handleDelete = (id: string) => {
    deleteEntry(id);
    setEntries(getEntries());
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (selectedEntry) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setSelectedEntry(null)}
            className="text-blue-400 font-bold min-h-12 px-2"
          >
            {t('form.back')}
          </button>
          <h2 className="text-2xl font-black">{t('history.title')}</h2>
        </div>
        <PayslipDisplay
          result={selectedEntry.result}
          employeeName={selectedEntry.employeeName}
          employerName={selectedEntry.employerName}
          periodStart={selectedEntry.periodStart}
          periodEnd={selectedEntry.periodEnd}
          monthlySalary={selectedEntry.monthlySalary}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="text-blue-400 font-bold min-h-12 px-2">
          {t('form.back')}
        </button>
        <h2 className="text-2xl font-black">{t('history.title')}</h2>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">{t('history.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-800 rounded-xl p-4 border-2 border-slate-700"
            >
              <div
                onClick={() => setSelectedEntry(entry)}
                className="cursor-pointer active:opacity-70"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-bold text-lg">{entry.employeeName}</p>
                    <p className="text-slate-400 text-sm">
                      {formatDate(entry.periodStart)} - {formatDate(entry.periodEnd)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">{t('history.netPay')}</p>
                    <p className="text-emerald-400 font-bold text-xl">
                      {formatCurrency(entry.netPay)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700">
                <p className="text-slate-500 text-xs">
                  {formatDate(entry.savedAt)}
                </p>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-red-400 font-bold text-sm active:text-red-300 px-3 py-1"
                >
                  {t('history.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
