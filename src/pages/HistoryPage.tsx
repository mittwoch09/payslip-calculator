import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { usePayslipHistory, type HistoryEntry } from '../hooks/usePayslipHistory';
import PayslipDisplay from '../components/PayslipDisplay';

export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getEntries, deleteEntry, getEntryById } = usePayslipHistory();
  const [entries, setEntries] = useState<HistoryEntry[]>(getEntries());

  const selectedEntry = id ? getEntryById(id) : null;

  const handleDelete = (entryId: string) => {
    deleteEntry(entryId);
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
            onClick={() => navigate('/history')}
            className="text-black font-bold min-h-12 px-2 underline"
          >
            {t('form.back')}
          </button>
          <h2 className="text-2xl font-black text-black">{t('history.title')}</h2>
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
        <button onClick={() => navigate('/')} className="text-black font-bold min-h-12 px-2 underline">
          {t('form.back')}
        </button>
        <h2 className="text-2xl font-black text-black">{t('history.title')}</h2>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">{t('history.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border-2 border-black p-4 shadow-[3px_3px_0_black]"
            >
              <div
                onClick={() => navigate(`/history/${entry.id}`)}
                className="cursor-pointer active:opacity-80"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-black font-bold text-lg">{entry.employeeName}</p>
                    <p className="text-gray-500 text-sm">
                      {formatDate(entry.periodStart)} - {formatDate(entry.periodEnd)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">{t('history.netPay')}</p>
                    <p className="text-black font-black text-xl">
                      {formatCurrency(entry.netPay)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-black">
                <p className="text-gray-400 text-xs">
                  {formatDate(entry.savedAt)}
                </p>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-red-600 font-bold text-sm px-3 py-1"
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
