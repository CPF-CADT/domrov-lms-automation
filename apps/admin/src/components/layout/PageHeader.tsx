import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                    {description && <p className="text-gray-600 text-sm mt-1">{description}</p>}
                </div>
                {actions && <div className="flex gap-2">{actions}</div>}
            </div>
        </div>
    );
};

export default PageHeader;
