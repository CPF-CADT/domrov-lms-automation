import React, { useState } from 'react';
import { CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { BaseModal, BaseButton } from '../base';
import { type Transaction, type PaymentTransaction, type AdminAdjustmentTransaction } from '../../services';
import { formatCurrency } from '../../utils';

interface TransactionModalProps {
    isOpen: boolean;
    transaction: Transaction | null;
    onClose: () => void;
}

const isPaymentTransaction = (t: Transaction): t is PaymentTransaction => {
    return t.transactionType === 'payment';
};

const isAdminAdjustmentTransaction = (t: Transaction): t is AdminAdjustmentTransaction => {
    return t.transactionType === 'admin_adjustment';
};

const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen,
    transaction,
    onClose,
}) => {
    const [imageError, setImageError] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(false);

    const handleClose = () => {
        setImageError(false);
        setFullscreenImage(false);
        onClose();
    };

    if (!transaction) return null;

    // Full-screen image view for payment transactions
    if (fullscreenImage && isPaymentTransaction(transaction) && transaction.proofImageUrl && !imageError) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                onClick={() => setFullscreenImage(false)}
            >
                <div className="bg-white rounded-lg w-[95vw] h-[75vh] max-w-7xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Transaction Proof - {transaction.id}</h3>
                        <button
                            onClick={() => setFullscreenImage(false)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-50 p-3">
                        <img
                            src={transaction.proofImageUrl}
                            alt="Transaction proof"
                            className="w-full h-full object-contain rounded-lg shadow-md"
                        />
                    </div>
                </div>
            </div>
        );
    }

    const statusColor: Record<string, string> = {
        paid: 'text-green-600 bg-green-50 border-green-200',
        unpaid: 'text-red-600 bg-red-50 border-red-200',
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Transaction ${transaction.id}`}
            size="lg"
            footer={
                <BaseButton variant="secondary" onClick={handleClose}>
                    Close
                </BaseButton>
            }
        >
            <div className="space-y-6">
                {/* Common Info */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Amount
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(transaction.amount)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Date
                        </p>
                        <p className="text-gray-700">
                            {new Date(transaction.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            User
                        </p>
                        <p className="text-gray-900 font-medium">{transaction.user}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Type
                        </p>
                        <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                                isAdminAdjustmentTransaction(transaction)
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                            {isAdminAdjustmentTransaction(transaction) ? 'Admin Adjustment' : 'Payment'}
                        </span>
                    </div>
                </div>

                {/* Payment Transaction Details */}
                {isPaymentTransaction(transaction) && (
                    <div className="space-y-4 border-t border-neutral-200 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                    Method
                                </p>
                                <p className="text-gray-700 capitalize">{transaction.method}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                    Status
                                </p>
                                <div
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                                        statusColor[transaction.status]
                                    }`}
                                >
                                    <span className="font-medium capitalize text-sm">
                                        {transaction.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Credit Package Info */}
                        {transaction.creditPackage && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-xs font-semibold text-purple-600 uppercase mb-3">
                                    Credit Package
                                </p>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-purple-600 font-medium mb-1">Package Name</p>
                                        <p className="text-gray-900 font-medium">{transaction.creditPackage.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-purple-600 font-medium mb-1">Credits</p>
                                            <p className="text-gray-900 font-semibold">{transaction.creditPackage.credits}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-purple-600 font-medium mb-1">Bonus</p>
                                            <p className="text-gray-900 font-semibold">
                                                {transaction.creditPackage.bonusCredits}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-purple-200">
                                        <p className="text-xs text-purple-600 font-medium mb-1">Total Credits</p>
                                        <p className="text-lg font-bold text-purple-700">
                                            {transaction.creditPackage.credits + transaction.creditPackage.bonusCredits}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Proof Image */}
                        {transaction.proofImageUrl && (
                            <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
                                    Transaction Proof
                                </p>
                                <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-neutral-200 group">
                                    {!imageError ? (
                                        <>
                                            <img
                                                src={transaction.proofImageUrl}
                                                alt="Transaction proof"
                                                className="w-full h-auto object-contain cursor-pointer group-hover:opacity-90 transition-opacity"
                                                onError={() => setImageError(true)}
                                                onClick={() => setFullscreenImage(true)}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                                                <div className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Click to view larger
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-48 bg-gray-50 text-gray-400">
                                            <div className="text-center">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Image unavailable</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User Note */}
                        {transaction.userNote && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                                    User Note
                                </p>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {transaction.userNote}
                                </p>
                            </div>
                        )}

                        {/* Verification Note */}
                        {transaction.verificationNote && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-xs font-semibold text-purple-600 uppercase mb-2">
                                    Verification Note
                                </p>
                                <p className="text-gray-700 text-sm">{transaction.verificationNote}</p>
                            </div>
                        )}

                        {/* Verification Status */}
                        {transaction.status === 'paid' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-700">
                                        Transaction verified - Status: Paid
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Admin Adjustment Transaction Details */}
                {isAdminAdjustmentTransaction(transaction) && (
                    <div className="space-y-4 border-t border-neutral-200 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                    Adjustment Type
                                </p>
                                <span
                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                                        transaction.adjustmentType === 'credit'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {transaction.adjustmentType}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                    Reason
                                </p>
                                <p className="text-gray-700 capitalize">{transaction.reason}</p>
                            </div>
                        </div>

                        {/* Balance Changes */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-purple-600 uppercase mb-3">
                                Balance Changes
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Balance Before</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {transaction.balanceBefore}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-t border-b border-purple-200">
                                    <span className="text-sm text-gray-600">Change</span>
                                    <span
                                        className={`text-sm font-bold ${
                                            transaction.adjustmentType === 'credit'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {transaction.adjustmentType === 'credit' ? '+' : '-'}
                                        {transaction.amount}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Balance After</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {transaction.balanceAfter}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {transaction.description && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                                    Description
                                </p>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {transaction.description}
                                </p>
                            </div>
                        )}

                        {/* Metadata */}
                        {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
                                    Additional Information
                                </p>
                                <div className="space-y-2 text-sm">
                                    {Object.entries(transaction.metadata).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                            <span className="text-gray-900 font-medium">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default TransactionModal;

