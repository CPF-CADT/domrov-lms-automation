import React from 'react';

interface BaseToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
}

const BaseToggle: React.FC<BaseToggleProps> = ({
    checked,
    onChange,
    disabled = false,
    label,
}) => {
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
            <div className="relative inline-block">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                    aria-label={label}
                />
                <div
                    className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-neutral-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-4' : ''
                        }`}
                />
            </div>
            {label && <span className="text-sm text-gray-700">{label}</span>}
        </label>
    );
};

export default BaseToggle;
