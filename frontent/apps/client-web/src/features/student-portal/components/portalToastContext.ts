import { createContext, useContext } from 'react';

export interface PortalToastContextValue {
  showToast: (message: string) => void;
}

export const PortalToastContext = createContext<PortalToastContextValue>({
  showToast: () => {},
});

export function usePortalToast() {
  return useContext(PortalToastContext);
}
