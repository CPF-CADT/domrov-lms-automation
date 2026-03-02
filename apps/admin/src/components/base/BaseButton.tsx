import React from 'react';
import { classNames } from '../../utils';

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-neutral-100 text-gray-700 hover:bg-neutral-200 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-neutral-100 focus:ring-blue-500',
};

const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
};

const BaseButton: React.FC<BaseButtonProps> = ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    className,
    ...props
}) => {
    return (
        <button
            className={classNames(
                'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                variantStyles[variant],
                sizeStyles[size],
                fullWidth && 'w-full',
                (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <LoadingSpinner size={size} />}
            {leftIcon && !isLoading && leftIcon}
            {children}
            {rightIcon && !isLoading && rightIcon}
        </button>
    );
};

const LoadingSpinner: React.FC<{ size: string }> = ({ size }) => {
    const sizeMap = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };
    return (
        <div className={`${sizeMap[size as keyof typeof sizeMap]} animate-spin rounded-full border-2 border-current border-t-transparent`} />
    );
};

export default BaseButton;
