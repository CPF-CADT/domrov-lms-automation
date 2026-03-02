import React from 'react';
import { STATUS_COLORS } from '../../constants/config';
import { classNames } from '../../utils';

interface BaseStatusBadgeProps {
    status: string;
    variant?: 'default' | 'subtle';
}

const BaseStatusBadge: React.FC<BaseStatusBadgeProps> = ({
    status,
    variant = 'default',
}) => {
    const colors =
        STATUS_COLORS[status as keyof typeof STATUS_COLORS] ||
        STATUS_COLORS.inactive;

    if (variant === 'subtle') {
        return (
            <span
                className={classNames(
                    'inline-block px-2.5 py-1 rounded-full text-xs font-medium',
                    colors.bg,
                    colors.text
                )}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    }

    return (
        <span
            className={classNames(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                colors.bg,
                colors.text
            )}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.icon}`} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

export default BaseStatusBadge;
