import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type OperationContextValue = {
  isBusy: boolean;
  label: string;
  startOperation: (label: string) => void;
  endOperation: () => void;
};

const OperationContext = createContext<OperationContextValue | null>(null);

export function OperationProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState('');
  const isBusy = Boolean(label);

  useEffect(() => {
    if (!isBusy) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBusy]);

  const value = useMemo(
    () => ({
      isBusy,
      label,
      startOperation: setLabel,
      endOperation: () => setLabel('')
    }),
    [isBusy, label]
  );

  return <OperationContext.Provider value={value}>{children}</OperationContext.Provider>;
}

export function useOperation() {
  const context = useContext(OperationContext);
  if (!context) {
    throw new Error('useOperation must be used within OperationProvider');
  }
  return context;
}
