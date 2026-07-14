"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; message: string; type: "success" | "error" };

const ToastContext = createContext<{
  push: (message: string, type?: "success" | "error") => void;
} | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const api = useMemo(
    () => ({
      push(message: string, type: "success" | "error" = "success") {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl px-4 py-2 text-sm text-white shadow ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToasterProvider");
  }
  return context;
}
