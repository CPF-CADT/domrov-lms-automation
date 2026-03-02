import { Eye } from 'lucide-react';
import { BaseStatusBadge } from '../base';
import { type Evaluation } from '../../services';
import { truncateText } from '../../utils';

interface EvaluationTableProps {
    evaluations: Evaluation[];
    isLoading?: boolean;
    onView?: (evaluation: Evaluation) => void;
}

const EvaluationTable: React.FC<EvaluationTableProps> = ({
    evaluations,
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

    if (evaluations.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-gray-600">
                No evaluations found
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        <th className="px-6 py-3 font-semibold text-gray-600">Evaluation ID</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">User</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Model</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Input</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Score</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {evaluations.map((e) => (
                        <tr
                            key={e.id}
                            className="border-b last:border-b-0 hover:bg-neutral-50 transition-colors"
                        >
                            <td className="px-6 py-4 font-mono text-xs text-gray-700">{e.id}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{e.user}</td>
                            <td className="px-6 py-4 text-gray-700 text-sm font-mono">{e.model}</td>
                            <td className="px-6 py-4 text-gray-700 text-sm max-w-xs">
                                <span title={e.input || ''}>{truncateText(e.input || '', 30)}</span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-900">
                                {(e.score ?? 0) > 0 ? e.score : '-'}
                            </td>
                            <td className="px-6 py-4">
                                <BaseStatusBadge status={e.status} variant="subtle" />
                            </td>
                            <td className="px-6 py-4 text-gray-700 text-sm">{e.date}</td>
                            <td className="px-6 py-4">
                                {onView && (
                                    <button
                                        className="p-2 rounded hover:bg-blue-50 transition"
                                        onClick={() => onView(e)}
                                        title="View Details"
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

export default EvaluationTable;
