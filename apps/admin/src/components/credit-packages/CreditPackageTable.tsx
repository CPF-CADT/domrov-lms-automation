
import type { CreditPackage } from '../../types';
import CreditPackageCard from './CreditPackageCard';

interface CreditPackageTableProps {
    packages: CreditPackage[];
    onEdit: (pkg: CreditPackage) => void;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    isLoading?: boolean;
}

const CreditPackageTable = ({
    packages,
    onEdit,
    onToggle,
    onDelete,
    isLoading = false,
}: CreditPackageTableProps) => {
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
        );
    }

    if (packages.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No packages available</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
                <CreditPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onEdit={onEdit}
                    onToggle={onToggle}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default CreditPackageTable;
