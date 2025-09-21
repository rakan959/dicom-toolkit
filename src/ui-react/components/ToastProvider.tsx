import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "info" | "success" | "warning" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };
type ToastContextType = { notify: (message: string, variant?: ToastVariant) => void };

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, message, variant }]);
    // Auto-dismiss after 3s
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: "fixed", right: 12, bottom: 12, zIndex: 1000 }}
      >
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {toasts.map((t) => {
            const bg =
              t.variant === "success"
                ? "#065f46"
                : t.variant === "warning"
                  ? "#92400e"
                  : t.variant === "error"
                    ? "#7f1d1d"
                    : "#1f2937";
            return (
              <li
                key={t.id}
                style={{
                  background: bg,
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                }}
              >
                {t.message}
              </li>
            );
          })}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}
