import React from 'react';
import { classNames } from '../../utils';

interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helper?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

const BaseInput: React.FC<BaseInputProps> = ({
    label,
    error,
    helper,
    icon,
    fullWidth = true,
    className,
    ...props
}) => {
    return (
        <div className={fullWidth ? 'w-full' : ''}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    className={classNames(
                        'w-full px-3 py-2 border border-neutral-200 rounded-lg text-gray-900 placeholder-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'transition-colors duration-200',
                        !!icon && 'pl-10',
                        error && 'border-red-500 focus:ring-red-500',
                        className
                    )}
                    {...props}
                />
                {icon && <div className="absolute left-3 top-2.5 text-gray-400">{icon}</div>}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            {helper && !error && <p className="text-gray-500 text-xs mt-1">{helper}</p>}
        </div>
    );
};

export default BaseInput;
