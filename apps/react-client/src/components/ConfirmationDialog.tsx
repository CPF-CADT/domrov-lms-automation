import { X, AlertCircle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationDialog({
    isOpen,
    title,
    message,
    confirmText = "Delete",
    cancelText = "Cancel",
    isDangerous = false,
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmationDialogProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "auto";
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95">
                {/* Close Button */}
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                {/* Content */}
                <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`shrink-0 ${isDangerous ? 'bg-red-100' : 'bg-blue-100'} rounded-lg p-3`}>
                        <AlertCircle
                            className={`w-6 h-6 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`}
                        />
                    </div>

                    {/* Text Content */}
                    <div className="flex-1">
                        <h3 className={`text-lg font-bold mb-2 ${isDangerous ? 'text-red-900' : 'text-slate-900'}`}>
                            {title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-6">
                            {message}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2 ${isDangerous
                                        ? "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
                                        : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    confirmText
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
