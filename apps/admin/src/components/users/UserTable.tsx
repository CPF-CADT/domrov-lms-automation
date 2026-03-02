import UserTableRow from './UserTableRow';
import { type User } from '../../services';

interface UserTableProps {
    users: User[];
    isLoading?: boolean;
    onView?: (user: User) => void;
    onAddCredit?: (user: User) => void;
    onDeductCredit?: (user: User) => void;
    onToggleStatus?: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({
    users,
    isLoading = false,
    onView,
    onAddCredit,
    onDeductCredit,
    onToggleStatus,
}) => {
    const columns = [
        { key: 'avatar', label: 'Avatar', width: 'w-12' },
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'balance', label: 'Balance' },
        { key: 'status', label: 'Status' },
        { key: 'created', label: 'Created' },
        { key: 'actions', label: 'Actions' },
    ];

    const renderRow = (user: User) => (
        <UserTableRow
            key={user.id}
            user={user}
            onView={onView}
            onAddCredit={onAddCredit}
            onDeductCredit={onDeductCredit}
            onToggleStatus={onToggleStatus}
        />
    );

    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-6 py-3 font-semibold text-gray-600"
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-8 text-center">
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                                </div>
                            </td>
                        </tr>
                    ) : users.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-600">
                                No users found
                            </td>
                        </tr>
                    ) : (
                        users.map((user) => renderRow(user))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default UserTable;
