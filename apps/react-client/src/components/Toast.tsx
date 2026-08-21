import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = "success", duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColorMap = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  };

  const textColorMap = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
  };

  const iconColorMap = {
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };

  const IconComponent = type === "error" ? AlertCircle : CheckCircle;

  return (
    <div
      className={`fixed top-4 right-4 max-w-md border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-2 ${bgColorMap[type]} z-50`}
    >
      <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColorMap[type]}`} />
      <div className={`flex-1 ${textColorMap[type]} text-sm font-medium`}>
        {message}
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className={`flex-shrink-0 ${textColorMap[type]} hover:opacity-70 transition-opacity`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = (message: string, type: ToastType = "success", duration = 4000) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast,
  };
}
