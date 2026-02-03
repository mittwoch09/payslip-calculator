import { useTranslation } from 'react-i18next';
import type { Corridor } from '../../types/remittance';

interface CorridorSelectorProps {
  value: string;
  onChange: (corridorId: string) => void;
  corridors: Corridor[];
}

export default function CorridorSelector({ value, onChange, corridors }: CorridorSelectorProps) {
  const { t } = useTranslation();

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
        {corridors.map((corridor) => (
          <option key={corridor.id} value={corridor.id}>
            {corridor.flag} {corridor.country}
          </option>
        ))}
      </select>
    </div>
  );
}
