import React from 'react';
import { classNames } from '../../utils';

interface BaseTableProps {
    columns: {
        key: string;
        label: string;
        width?: string;
        align?: 'left' | 'center' | 'right';
    }[];
    data: any[];
    renderRow: (row: any) => React.ReactNode;
    isLoading?: boolean;
    emptyMessage?: string;
    striped?: boolean;
}

const BaseTable: React.FC<BaseTableProps> = ({
    columns,
    data,
    renderRow,
    isLoading = false,
    emptyMessage = 'No data available',
    striped = true,
}) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-gray-500">
                Loading...
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-gray-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={classNames(
                                    'px-6 py-3 font-semibold text-gray-600',
                                    col.width && col.width,
                                    col.align === 'center' && 'text-center',
                                    col.align === 'right' && 'text-right'
                                )}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr
                            key={row.id || idx}
                            className={classNames(
                                'border-b border-neutral-200 hover:bg-neutral-50 transition-colors',
                                striped && idx % 2 === 0 && 'bg-white',
                                striped && idx % 2 !== 0 && 'bg-neutral-50/30'
                            )}
                        >
                            {renderRow(row)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BaseTable;
