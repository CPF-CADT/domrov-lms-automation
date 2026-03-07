import React from 'react';
import { Eye, Cpu, Terminal } from 'lucide-react';

import { type AIUsageLog } from '../../services/aiEvaluationservice';

interface AIUsageLogTableProps {
    logs: AIUsageLog[];
    isLoading?: boolean;
    onView?: (log: AIUsageLog) => void;
}

const AIUsageLogTable: React.FC<AIUsageLogTableProps> = ({
    logs,
    isLoading = false,
    onView,
}) => {
    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                </div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-gray-600">
                No AI usage logs found
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        <th className="px-6 py-3 font-semibold text-gray-600">ID</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">User</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Total Tokens</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Details</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr
                            key={log.id}
                            className="border-b last:border-b-0 hover:bg-neutral-50 transition-colors"
                        >
                            <td className="px-6 py-4 font-mono text-xs text-gray-700">{log.id}</td>

                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {log.user.profilePictureUrl ? (
                                        <img
                                            src={log.user.profilePictureUrl}
                                            alt={log.user.firstName}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {log.user.firstName.charAt(0)}
                                            {log.user.lastName ? log.user.lastName.charAt(0) : ''}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {log.user.firstName} {log.user.lastName || ''}
                                        </p>
                                        <p className="text-xs text-gray-500">{log.user.email}</p>
                                    </div>
                                </div>
                            </td>

                            <td className="px-6 py-4 font-semibold text-blue-600">
                                {log.totalTokenCount.toLocaleString()}
                            </td>

                            <td className="px-6 py-4">
                                <div className="text-sm">
                                    <p className="font-medium text-gray-900 line-clamp-1" title={log.title}>
                                        {log.title}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Terminal className="w-3 h-3" /> In: {log.inputTokenCount.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Cpu className="w-3 h-3" /> Out: {log.outputTokenCount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            <td className="px-6 py-4 text-gray-700 text-xs">
                                {new Date(log.usingDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </td>

                            <td className="px-6 py-4">
                                {onView && (
                                    <button
                                        className="p-2 rounded hover:bg-blue-50 transition flex items-center gap-2"
                                        onClick={() => onView(log)}
                                        title="View details"
                                    >
                                        <Eye className="w-4 h-4 text-blue-600" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AIUsageLogTable;