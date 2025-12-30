"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    const baseStyles = {
      padding: "1rem 1.5rem",
      borderRadius: "12px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      minWidth: "300px",
      maxWidth: "400px",
      animation: "slideIn 0.3s ease-out",
    };

    switch (type) {
      case "success":
        return { ...baseStyles, background: "#10b981", color: "white" };
      case "error":
        return { ...baseStyles, background: "#ef4444", color: "white" };
      case "warning":
        return { ...baseStyles, background: "#f59e0b", color: "white" };
      case "info":
        return { ...baseStyles, background: "#3b82f6", color: "white" };
      default:
        return baseStyles;
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={getToastStyles(toast.type)}
            onClick={() => removeToast(toast.id)}
          >
            <span style={{ fontSize: "1.25rem" }}>{getIcon(toast.type)}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "0.25rem",
                opacity: 0.7,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
