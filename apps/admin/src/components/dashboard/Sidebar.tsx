import { NavLink, useNavigate } from 'react-router-dom';
import { memo } from 'react';
import { LayoutDashboard, Users, Package, CreditCard, Brain, FileText, Settings, BadgeCent, LogOut } from 'lucide-react';
import { APP_NAME, ROUTES } from '../../constants/config';
import { useAuth } from '../../context/authContext';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.DASHBOARD },
    { label: 'Users', icon: Users, to: ROUTES.USERS },
    { label: 'Credit Packages', icon: Package, to: ROUTES.PACKAGES },
    { label: 'Transactions', icon: CreditCard, to: ROUTES.TRANSACTIONS },
    { label: 'AI Evaluations', icon: Brain, to: ROUTES.EVALUATIONS },
    { label: 'System Logs', icon: FileText, to: '#', disabled: true },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-neutral-50'
    }`;

interface NavItemProps {
    label: string;
    icon: React.ComponentType<{ className: string }>;
    to: string;
}

const NavItem = memo(({ label, icon: Icon, to }: NavItemProps) => (
    <NavLink to={to} className={navLinkClass} end={to !== '#'}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{label}</span>
    </NavLink>
));
NavItem.displayName = 'NavItem';

const Sidebar = memo(() => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate(ROUTES.LOGIN, { replace: true });
    };

    return (
        <aside className="hidden lg:flex w-56 xl:w-64 bg-white flex-col h-screen border-r-2 border-neutral-100 overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-center h-16 px-4 border-b border-neutral-200 flex-shrink-0">
                <div className="flex items-center gap-2 select-none">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <BadgeCent className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-gray-900">{APP_NAME}</span>
                </div>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                {navItems.map(({ label, icon, to, disabled }) =>
                    disabled ? null : <NavItem key={label} label={label} icon={icon} to={to} />
                )}
            </nav>

            <div className="border-t border-neutral-200 px-3 py-4 space-y-1 flex-shrink-0">
                <NavLink to={ROUTES.SETTINGS} className={navLinkClass}>
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                </NavLink>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors text-gray-700 hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
});
Sidebar.displayName = 'Sidebar';

export default Sidebar;