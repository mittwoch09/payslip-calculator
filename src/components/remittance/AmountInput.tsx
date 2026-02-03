import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AmountInputProps {
  value: number;
  onChange: (amount: number) => void;
}

export default function AmountInput({ value, onChange }: AmountInputProps) {
  const { t } = useTranslation();
  const [displayValue, setDisplayValue] = useState(value > 0 ? value.toString() : '');

  // Sync displayValue when external value changes (e.g., from initialAmount)
  useEffect(() => {
    if (value > 0) {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Update parent only if valid number
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    } else if (inputValue === '') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    // Format on blur if there's a valid value
    if (displayValue !== '' && !isNaN(parseFloat(displayValue))) {
      const numValue = parseFloat(displayValue);
      setDisplayValue(numValue > 0 ? numValue.toString() : '');
      onChange(numValue);
    } else {
      setDisplayValue('');
      onChange(0);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-bold mb-2 text-black">
        {t('remittance.amount')}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-black pointer-events-none">
          S$
        </div>
        <input
          type="number"
          min={0}
          step={10}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full bg-white border-2 border-black px-4 py-3 pl-12 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}
