import React from 'react';
import { BaseModal, BaseInput, BaseButton, BaseToggle } from '../base';
import { useForm } from '../../hooks';
import { validatePositiveNumber, validateNotEmpty } from '../../utils';
import type { CreditPackage } from '../../types/credit-package';

type CreditPackageInput = Partial<Omit<CreditPackage, 'id' | 'created_at' | 'updated_at'>> & { id?: number };

interface CreditPackageModalProps {
    isOpen: boolean;
    pkg?: CreditPackageInput | null;
    onClose: () => void;
    onSave: (pkg: CreditPackageInput) => void;
    isLoading?: boolean;
}

const CreditPackageModal: React.FC<CreditPackageModalProps> = ({
    isOpen,
    pkg,
    onClose,
    onSave,
    isLoading = false,
}) => {
    const { values, errors, isSubmitting, handleChange, setFieldError, setFieldValue, resetForm } =
        useForm<CreditPackageInput>(
            pkg || {
                name: '',
                description: '',
                credits: 0,
                bonusCredits: 0,
                price: 0,
                currency: 'USD',
                discountInPercent: 0,
                isActive: true,
            }
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate fields
        if (!validateNotEmpty(values.name ?? '')) {
            setFieldError('name', 'Package name is required');
            return;
        }
        if (!validatePositiveNumber(values.credits ?? 0)) {
            setFieldError('credits', 'Credits must be a positive number');
            return;
        }
        if (!validatePositiveNumber(values.price ?? 0)) {
            setFieldError('price', 'Price must be a positive number');
            return;
        }
        if (!validateNotEmpty(values.currency || '')) {
            setFieldError('currency', 'Currency is required');
            return;
        }
        onSave(values);
        resetForm();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={pkg ? 'Edit Package' : 'Create Package'}
            size="lg"
            footer={
                <>
                    <BaseButton variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </BaseButton>
                    <BaseButton
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={isSubmitting || isLoading}
                    >
                        {pkg ? 'Update' : 'Create'}
                    </BaseButton>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-4 py-3">
                {/* Row 1: Name */}
                <BaseInput
                    label="Package Name *"
                    name="name"
                    value={values.name || ''}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="e.g., Starter, Pro, Enterprise"
                    required
                />

                {/* Row 2: Description */}
                <BaseInput
                    label="Description"
                    name="description"
                    value={values.description || ''}
                    onChange={handleChange}
                    error={errors.description}
                    placeholder="Short description of the package"
                />

                {/* Row 3: Credits and Bonus Credits - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                    <BaseInput
                        label="Credits *"
                        name="credits"
                        type="number"
                        value={values.credits ? String(values.credits) : ''}
                        onChange={handleChange}
                        error={errors.credits}
                        min={1}
                        placeholder="Enter credits"
                        required
                    />
                    <BaseInput
                        label="Bonus Credits"
                        name="bonusCredits"
                        type="number"
                        value={values.bonusCredits ? String(values.bonusCredits) : ''}
                        onChange={handleChange}
                        error={errors.bonusCredits}
                        min={0}
                        placeholder="Enter bonus"
                    />
                </div>

                {/* Row 4: Price and Currency - 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                    <BaseInput
                        label="Price *"
                        name="price"
                        type="number"
                        value={values.price ? String(values.price) : ''}
                        onChange={handleChange}
                        error={errors.price}
                        min={0.01}
                        step={0.01}
                        placeholder="Enter price"
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Currency *
                        </label>
                        <select
                            name="currency"
                            value={values.currency || 'USD'}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                            required
                        >
                            <option value="USD">USD (US Dollar)</option>
                            <option value="KHR">KHR (Cambodian Riel)</option>
                        </select>
                        {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency}</p>}
                    </div>
                </div>

                {/* Row 5: Discount */}
                <BaseInput
                    label="Discount %"
                    name="discountInPercent"
                    type="number"
                    value={values.discountInPercent ? String(values.discountInPercent) : ''}
                    onChange={handleChange}
                    error={errors.discountInPercent}
                    min={0}
                    max={100}
                    placeholder="Enter discount %"
                />

                {/* Row 6: Active Toggle */}
                <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                    <span className="text-sm font-medium text-gray-700">Active</span>
                    <BaseToggle
                        checked={values.isActive ?? true}
                        onChange={(checked) => setFieldValue('isActive', checked)}
                    />
                </div>
            </form>
        </BaseModal>
    );
};

export default CreditPackageModal;
