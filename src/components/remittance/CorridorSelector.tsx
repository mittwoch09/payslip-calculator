import { useTranslation } from 'react-i18next';
import type { Corridor } from '../../types/remittance';

interface CorridorSelectorProps {
  value: string;
  onChange: (corridorId: string) => void;
  corridors: Corridor[];
}

export default function CorridorSelector({ value, onChange, corridors }: CorridorSelectorProps) {
  const { t } = useTranslation();

  const popularityOrder = ['SGD-INR', 'SGD-BDT', 'SGD-MMK', 'SGD-CNY', 'SGD-PHP', 'SGD-IDR', 'SGD-THB'];
  const sortedCorridors = [...corridors].sort((a, b) => {
    const aIdx = popularityOrder.indexOf(a.id);
    const bIdx = popularityOrder.indexOf(b.id);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return (
    <div className="space-y-2">
      <label htmlFor="corridor" className="block text-sm font-bold">
        {t('remittance.sendTo')}
      </label>
      <select
        id="corridor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        {sortedCorridors.map((corridor) => (
          <option key={corridor.id} value={corridor.id}>
            {corridor.flag} {corridor.country}
          </option>
        ))}
      </select>
    </div>
  );
}
