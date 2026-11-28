import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PortalToastContext } from './portalToastContext';

export function PortalToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <PortalToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`no-print pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-[10px] bg-[#243B53] px-[18px] py-2.5 text-[14px] font-medium text-[#F5FAFE] shadow-lg transition-all duration-200 ${
          message ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {message}
      </div>
    </PortalToastContext.Provider>
  );
}
