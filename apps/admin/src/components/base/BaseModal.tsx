import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { classNames } from '../../utils';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    closeButton?: boolean;
}

const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
};

const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeButton = true,
}) => {
    // Block scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = 'auto';
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.documentElement.style.overflow = 'auto';
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
            onClick={onClose}
        >
            <div
                className={classNames(
                    'bg-white rounded-lg shadow-lg p-6 w-full mx-4',
                    sizeStyles[size]
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {closeButton && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    )}
                </div>
                <div className="mb-6">{children}</div>
                {footer && (
                    <div className="flex gap-2 justify-end border-t border-neutral-200 pt-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaseModal;
