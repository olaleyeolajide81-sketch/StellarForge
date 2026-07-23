"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  txHash?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, txHash?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, txHash?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message, txHash }]);
      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 6000);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    loading: <Loader2 className="w-5 h-5 text-primary animate-spin" />,
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl glass border border-border/50 shadow-2xl animate-slide-in-right"
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  View transaction ↗
                </a>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
