import { useState, useEffect, useRef, type RefObject } from 'react';

interface ScrollButtonsProps {
  bottomRef: RefObject<HTMLDivElement | null>;
}

export default function ScrollButtons({ bottomRef }: ScrollButtonsProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const show = () => {
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    };

    show();
    window.addEventListener('scroll', show, { passive: true });
    window.addEventListener('touchstart', show, { passive: true });
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('scroll', show);
      window.removeEventListener('touchstart', show);
    };
  }, []);

  return (
    <div
      className={`no-print fixed bottom-6 right-4 z-50 flex flex-col gap-2 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-9 h-9 bg-white border-2 border-black text-black text-sm font-black shadow-[2px_2px_0_black] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
        aria-label="Scroll to top"
      >
        ↑
      </button>
      <button
        onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
        className="w-9 h-9 bg-black border-2 border-black text-white text-sm font-black shadow-[2px_2px_0_#7c3aed] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
        aria-label="Scroll to bottom"
      >
        ↓
      </button>
    </div>
  );
}
