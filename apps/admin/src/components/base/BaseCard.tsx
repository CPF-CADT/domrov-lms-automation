import React from 'react';
import { classNames } from '../../utils';

interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverable?: boolean;
    padding?: 'sm' | 'md' | 'lg';
}

const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

const BaseCard: React.FC<BaseCardProps> = ({
    hoverable = false,
    padding = 'md',
    className,
    children,
    ...props
}) => {
    return (
        <div
            className={classNames(
                'bg-white rounded-lg border border-neutral-200',
                paddingStyles[padding],
                hoverable && 'hover:shadow-sm transition-shadow cursor-pointer',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default BaseCard;
