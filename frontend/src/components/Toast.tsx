'use client';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastContextType {
  toast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-[340px] z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastMessage key={t.id} item={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const bg = item.type === 'error' ? 'bg-red-900/80 border-red-700/50' :
             item.type === 'success' ? 'bg-green-900/80 border-green-700/50' :
             'bg-slate-800/80 border-slate-600/50';

  const text = item.type === 'error' ? 'text-red-200' :
               item.type === 'success' ? 'text-green-200' : 'text-slate-200';

  return (
    <div
      className={`pointer-events-auto glass-panel border rounded-lg px-4 py-2.5 max-w-xs transition-all duration-300 ${bg} ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <div className="flex items-start gap-2">
        <p className={`text-[11px] ${text}`}>{item.message}</p>
        <button onClick={onDismiss} className="text-slate-500 hover:text-white text-xs shrink-0">×</button>
      </div>
    </div>
  );
}
