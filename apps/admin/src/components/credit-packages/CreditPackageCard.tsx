import { Edit, Trash2 } from 'lucide-react';
import { BaseCard, BaseButton, BaseToggle } from '../base';
import { type CreditPackage } from '../../services';
import { formatCurrency } from '../../utils';

interface CreditPackageCardProps {
    pkg: CreditPackage;
    onEdit: (pkg: CreditPackage) => void;
    onToggle: (id: CreditPackage['id']) => void;
    onDelete: (id: CreditPackage['id']) => void;
}

const CreditPackageCard: React.FC<CreditPackageCardProps> = ({
    pkg,
    onEdit,
    onToggle,
    onDelete,
}) => {
    const isChecked =
        'status' in pkg
            ? Boolean((pkg as { status?: boolean }).status)
            : 'isActive' in pkg
                ? Boolean((pkg as { isActive?: boolean }).isActive)
                : false;

    const isPopular =
        'popular' in pkg
            ? Boolean((pkg as { popular?: boolean }).popular)
            : false;

    return (
        <BaseCard padding="lg" className="flex flex-col relative">
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                    Most Popular
                </div>
            )}

            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                <BaseToggle
                    checked={isChecked}
                    onChange={() => onToggle(pkg.id)}
                />
            </div>

            <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(pkg.price)}</p>
            </div>

            <div className="bg-blue-50 rounded-lg py-4 px-3 mb-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{pkg.credits.toLocaleString()}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1">Credits</p>
            </div>

            <ul className="text-sm text-gray-700 space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    Never expires
                </li>
            </ul>

            <div className="flex gap-2">
                <BaseButton
                    variant="secondary"
                    size="md"
                    leftIcon={<Edit className="w-4 h-4" />}
                    onClick={() => onEdit(pkg)}
                    fullWidth
                >
                    Edit
                </BaseButton>
                <BaseButton
                    variant="danger"
                    size="md"
                    onClick={() => onDelete(pkg.id)}
                    className="flex-shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                </BaseButton>
            </div>
        </BaseCard>
    );
};

export default CreditPackageCard;
