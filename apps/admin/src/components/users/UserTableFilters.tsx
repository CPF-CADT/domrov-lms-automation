import React from 'react';
import { Search } from 'lucide-react';
import { USER_ROLES, USER_STATUSES } from '../../constants/config';

interface UserTableFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    roleFilter: string;
    onRoleChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
}

const UserTableFilters: React.FC<UserTableFiltersProps> = ({
    search,
    onSearchChange,
    roleFilter,
    onRoleChange,
    statusFilter,
    onStatusChange,
}) => (
    <div className="flex flex-col md:flex-row gap-3 w-full">
        <div className="relative flex-1">
            <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
            <option value="all">All Roles</option>
            {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
            ))}
        </select>

        <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-100 border border-neutral-200 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
            <option value="all">All Status</option>
            {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
            ))}
        </select>
    </div>
);

export default React.memo(UserTableFilters);
