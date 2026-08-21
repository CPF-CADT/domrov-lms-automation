import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DialogButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  buttons: DialogButton[];
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  description,
  icon,
  iconBgColor = 'bg-red-100',
  buttons,
  children,
  size = 'md',
}: DialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Blur the main app content but not the dialog
      const appContainer = document.querySelector('[role="main"]') || document.querySelector('.min-h-screen');
      if (appContainer && appContainer instanceof HTMLElement) {
        appContainer.style.filter = 'blur(4px)';
      }
    } else {
      // Remove blur when closed
      const appContainer = document.querySelector('[role="main"]') || document.querySelector('.min-h-screen');
      if (appContainer && appContainer instanceof HTMLElement) {
        appContainer.style.filter = 'blur(0px)';
      }
    }
    return () => {
      const appContainer = document.querySelector('[role="main"]') || document.querySelector('.min-h-screen');
      if (appContainer && appContainer instanceof HTMLElement) {
        appContainer.style.filter = 'blur(0px)';
      }
    };
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-3xl',
  };

  const getButtonClasses = (variant: string = 'secondary') => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300';
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300';
      case 'secondary':
      default:
        return 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100';
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-white/20 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`${sizeClasses[size]} bg-white rounded-2xl shadow-2xl p-8 sm:p-10`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute transition-colors top-5 right-5 text-slate-400 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Icon and Title Section */}
          <div className="flex items-start gap-5 mb-6">
            {icon && (
              <div
                className={`flex-shrink-0 w-16 h-16 rounded-full ${iconBgColor} flex items-center justify-center`}
              >
                {icon}
              </div>
            )}
            <div className={icon ? '' : 'w-full'}>
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="mb-8 text-base leading-relaxed text-slate-600">
              {description}
            </p>
          )}

          {/* Custom Content */}
          {children && <div className="mb-8">{children}</div>}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-8 border-t border-slate-200">
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => {
                  button.onClick();
                  handleClose();
                }}
                disabled={button.disabled}
                className={`px-6 py-3 text-base font-medium rounded-lg transition-colors ${getButtonClasses(
                  button.variant
                )}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
