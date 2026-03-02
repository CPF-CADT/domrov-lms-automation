import { Eye, Plus, Minus, Lock, Unlock ,Currency } from 'lucide-react';
import UserStatusBadge from './UserStatusBadge';
import { type User } from '../../services';

interface UserTableRowProps {
    user: User;
    onView?: (user: User) => void;
    onAddCredit?: (user: User) => void;
    onDeductCredit?: (user: User) => void;
    onToggleStatus?: (user: User) => void;
}

const UserTableRow: React.FC<UserTableRowProps> = ({
    user,
    onView,
    onAddCredit,
    onDeductCredit,
    onToggleStatus,
}) => {
    const isActive = user.status === 'ACTIVE' || user.status === 'active';
    const userAvatar = user.avatar || user.profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.firstName || 'User');
    const fullName = user.name || `${user.firstName} ${user.lastName || ''}`.trim();
    const statusLabel = user.status.toLowerCase();

    return (
        <tr className="border-b last:border-b-0 hover:bg-neutral-50 transition-colors">
            <td className="px-6 py-4 w-12">
                <img
                    src={userAvatar}
                    alt={fullName}
                    className="w-9 h-9 rounded-full object-cover border border-neutral-200"
                />
            </td>
            <td className="px-6 py-4 font-medium text-gray-900">{fullName}</td>
            <td className="px-6 py-4 text-gray-700">{user.email}</td>
            <td className="px-6 py-4 text-sm text-gray-700">{user.role || '-'}</td>
            <td className="px-6 py-4 font-semibold text-gray-900">{user.balance || 0} <Currency className="w-4 h-4 inline ml-1 text-amber-500" /></td>
            <td className="px-6 py-4">
                <UserStatusBadge status={statusLabel} />
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{user.created ? new Date(user.created).toLocaleDateString() : '-'}</td>
            <td className="px-6 py-4">
                <div className="flex gap-2">
                    {onView && (
                        <button
                            className="p-2 rounded hover:bg-blue-50 transition"
                            onClick={() => onView(user)}
                            title="View Details"
                        >
                            <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                    )}
                    {onAddCredit && (
                        <button
                            className="p-2 rounded hover:bg-green-50 transition"
                            onClick={() => onAddCredit(user)}
                            title="Add Credit"
                        >
                            <Plus className="w-4 h-4 text-green-600" />
                        </button>
                    )}
                    {onDeductCredit && (
                        <button
                            className="p-2 rounded hover:bg-amber-50 transition"
                            onClick={() => onDeductCredit(user)}
                            title="Deduct Credit"
                        >
                            <Minus className="w-4 h-4 text-amber-600" />
                        </button>
                    )}
                    {onToggleStatus && (
                        <button
                            className="p-2 rounded hover:bg-neutral-100 transition"
                            onClick={() => onToggleStatus(user)}
                            title={isActive ? 'Disable Account' : 'Enable Account'}
                        >
                            {isActive ? (
                                <Lock className="w-4 h-4 text-red-600" />
                            ) : (
                                <Unlock className="w-4 h-4 text-green-600" />
                            )}
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default UserTableRow;
