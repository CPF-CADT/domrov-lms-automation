import { BaseModal, BaseButton, BaseStatusBadge } from '../base';
import type { User } from '../../services';
import React from 'react';

interface ViewUserModalProps {
    isOpen: boolean;
    user: User;
    onClose: () => void;
}

const ViewUserModal: React.FC<ViewUserModalProps> = ({ isOpen, user, onClose }) => {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        if (!status) return 'active';
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'active') return 'active';
        if (lowerStatus === 'banned' || lowerStatus === 'suspended') return 'suspended';
        return 'inactive';
    };

    const getTransactionStatusColor = (status: string) => {
        if (!status) return 'text-gray-600';
        // Normalize status by trimming whitespace and converting to uppercase
        const normalizedStatus = String(status).trim().toUpperCase();
        if (normalizedStatus === 'COMPLETED') return 'text-green-600';
        if (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED') return 'text-red-600';
        if (normalizedStatus === 'PENDING') return 'text-yellow-600';
        // Default fallback
        return 'text-gray-600';
    };    

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="User Details"
            size="4xl"
            footer={
                <BaseButton variant="secondary" onClick={onClose}>
                    Close
                </BaseButton>
            }
        >
            <div className="flex gap-6 max-h-[85vh]">
                {/* Left Column - User Information (No Scroll, 60% width) */}
                <div className="flex-[0.6] space-y-4 overflow-hidden flex flex-col">
                    {/* User Header with Avatar */}
                    <div className="flex gap-4 items-start pb-3 border-b border-neutral-200 flex-shrink-0">
                        <img
                            src={user.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id}
                            alt={user.firstName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-neutral-200 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{user.firstName} {user.lastName || ''}</h3>
                            <p className="text-sm text-gray-600 mt-1 truncate">{user.email}</p>
                            <div className="mt-2 flex gap-2">
                                <BaseStatusBadge status={getStatusColor(user.status)} />
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="space-y-4 pr-2">
                        {/* Personal Information Section */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Personal Information</h4>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">First Name</label>
                                        <p className="text-sm text-gray-900 mt-1 truncate">{user.firstName}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Last Name</label>
                                        <p className="text-sm text-gray-900 mt-1 truncate">{user.lastName || '-'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Gender</label>
                                        <p className="text-sm text-gray-900 mt-1 truncate">{user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-'}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">DOB</label>
                                        <p className="text-sm text-gray-900 mt-1 truncate">{user.dob ? new Date(user.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                                    <p className="text-sm text-gray-900 mt-1 break-words">{user.email}</p>
                                </div>
                                <div className="min-w-0">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                                    <p className="text-sm text-gray-900 mt-1">{user.phoneNumber || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Account Information Section */}
                        <div className="pt-2 border-t border-neutral-200">
                            <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Account Information</h4>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Role</label>
                                        <p className="text-sm text-gray-900 mt-1 truncate">{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '-'}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                                        <p className="mt-2">
                                            <BaseStatusBadge status={getStatusColor(user.status)} variant="subtle" />
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Verified</label>
                                        <p className="text-sm text-gray-900 mt-1">{user.isVerified ? 'Yes ✓' : 'No'}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Credits</label>
                                        <p className="text-sm font-semibold text-blue-600 mt-1">{user.credits || 0}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Total Spent</label>
                                        <p className="text-sm text-gray-900 mt-1">${user.totalSpent ? user.totalSpent.toFixed(2) : '0.00'}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Purchases</label>
                                        <p className="text-sm text-gray-900 mt-1">{user.totalPurchased || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Information Section */}
                        <div className="pt-2 border-t border-neutral-200">
                            <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Activity</h4>
                            <div className="space-y-2">
                                <div className="min-w-0">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Join Date</label>
                                    <p className="text-sm text-gray-900 mt-1 truncate">{formatDate(user.joinDate)}</p>
                                </div>
                                <div className="min-w-0">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Last Activity</label>
                                    <p className="text-sm text-gray-900 mt-1 truncate">{formatDate(user.lastActivity)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                

                {/* Right Column - Recent Transactions (Scrollable, 40% width) */}
                {user.recentTransactions && user.recentTransactions.length > 0 && (
                    <div className="flex-[0.4] border-l border-neutral-200 pl-4 flex flex-col min-w-0">
                        <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide flex-shrink-0">
                            Recent <span className="text-blue-600">({user.recentTransactions.length})</span>
                        </h4>
                        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                            {user.recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors flex-shrink-0">
                                    <p className="text-xs font-medium text-gray-600 truncate">#{transaction.id}</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-1">${transaction.amount.toFixed(2)}</p>
                                    <p className="text-xs text-gray-600 mt-1 truncate">{formatDate(transaction.date)}</p>
                                    <p className={`text-xs font-medium mt-1 ${getTransactionStatusColor(transaction.status)}`}>
                                        {transaction.status}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default ViewUserModal;