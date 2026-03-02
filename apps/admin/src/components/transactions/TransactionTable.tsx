import { Eye, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { type Transaction, type PaymentTransaction, type AdminAdjustmentTransaction } from '../../services';
import { formatCurrency } from '../../utils';

interface TransactionTableProps {
    transactions: Transaction[];
    isLoading?: boolean;
    onView?: (transaction: Transaction) => void;
}

const isPaymentTransaction = (t: Transaction): t is PaymentTransaction => {
    return t.transactionType === 'payment';
};

const isAdminAdjustmentTransaction = (t: Transaction): t is AdminAdjustmentTransaction => {
    return t.transactionType === 'admin_adjustment';
};

const TransactionTable: React.FC<TransactionTableProps> = ({
    transactions,
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

    if (transactions.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-gray-600">
                No transactions found
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
                        <th className="px-6 py-3 font-semibold text-gray-600">Amount</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Type</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Details</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t) => (
                        <tr
                            key={t.id}
                            className="border-b last:border-b-0 hover:bg-neutral-50 transition-colors"
                        >
                            <td className="px-6 py-4 font-mono text-xs text-gray-700">{t.id}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{t.user}</td>
                            <td className="px-6 py-4 font-semibold text-green-600">
                                {formatCurrency(t.amount)}
                            </td>
                            <td className="px-6 py-4">
                                <span
                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                                        isAdminAdjustmentTransaction(t)
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}
                                >
                                    {isAdminAdjustmentTransaction(t) ? 'Admin Adjustment' : 'Payment'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {isPaymentTransaction(t) ? (
                                    <div className="text-sm">
                                        <p className="font-medium text-gray-900">
                                            {t.creditPackage?.name || 'N/A'}
                                        </p>
                                        {t.creditPackage && (
                                            <p className="text-xs text-gray-500">
                                                {t.creditPackage.credits} + {t.creditPackage.bonusCredits} bonus
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500">{t.method}</p>
                                        <span
                                            className={`inline-flex items-center gap-1 mt-1 ${
                                                t.status === 'paid'
                                                    ? 'text-green-700'
                                                    : 'text-red-700'
                                            }`}
                                        >
                                            {t.status === 'paid' ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <AlertCircle className="w-3 h-3" />
                                            )}
                                            <span className="text-xs font-medium">{t.status}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-sm">
                                        <p className="font-medium text-gray-900">{t.reason}</p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {t.adjustmentType} Adjustment
                                        </p>
                                        {t.description && (
                                            <p className="text-xs text-gray-500">{t.description}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            Balance: {t.balanceBefore} → {t.balanceAfter}
                                        </p>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-gray-700 text-xs">
                                {new Date(t.date).toLocaleDateString('en-US', {
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
                                        onClick={() => onView(t)}
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

export default TransactionTable;
