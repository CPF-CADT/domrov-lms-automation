import { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import CreditPackageTable from '../components/credit-packages/CreditPackageTable';
import CreditPackageModal from '../components/credit-packages/CreditPackageModal';
import { BaseButton, BaseModal } from '../components/base';
import { MainLayout, PageHeader } from '../components/layout';
import { creditPackageService } from '../services';
import { type CreditPackageResponseDto } from '../types/admin-wallet';
import { useModal } from '../hooks';

const CreditPackages = () => {
  const [packages, setPackages] = useState<CreditPackageResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [togglePackageId, setTogglePackageId] = useState<number | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { isOpen: modalOpen, openModal, closeModal } = useModal();
  const { isOpen: toggleModalOpen, openModal: openToggleModal, closeModal: closeToggleModal } = useModal();

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  // Clear success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await creditPackageService.fetchPackages();
      setPackages(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load packages. Please try again.';
      setError(errorMsg);
      console.error('Load packages error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    openModal();
  };

  const handleCreatePackage = async (data: {
    name: string;
    description: string;
    credits: number;
    price: number;
    currency: string;
    bonusCredits?: number;
    sortOrder?: number;
    isActive?: boolean;
  }) => {
    try {
      setIsCreating(true);
      setError(null);
      await creditPackageService.createPackage(data);
      await loadPackages();
      setSuccessMessage(`Package "${data.name}" created successfully`);
      closeModal();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create package. Please try again.';
      setError(errorMsg);
      console.error('Create package error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    setTogglePackageId(id);
    openToggleModal();
  };

  const confirmToggle = async () => {
    if (!togglePackageId) return;
    try {
      setIsTogglingStatus(true);
      setError(null);
      const pkg = packages.find((p) => p.id === togglePackageId);
      await creditPackageService.togglePackageStatus(togglePackageId);
      await loadPackages();
      setSuccessMessage(
        `Package status changed to ${!pkg?.isActive ? 'active' : 'inactive'}`
      );
      closeToggleModal();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update package status. Please try again.';
      setError(errorMsg);
      console.error('Toggle package error:', err);
    } finally {
      setIsTogglingStatus(false);
      setTogglePackageId(null);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Credit Packages"
        description="Manage credit bundles available for users to purchase."
        actions={
          <BaseButton
            variant="primary"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={handleCreate}
          >
            Create Package
          </BaseButton>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Packages Table */}
      <div className="mb-6">
        <CreditPackageTable
          packages={packages}
          isLoading={isLoading}
          onToggle={handleToggle}
        />
      </div>

      {/* Create Package Modal */}
      {modalOpen && (
        <CreditPackageModal
          isOpen={modalOpen}
          onClose={closeModal}
          onSubmit={handleCreatePackage}
          isSubmitting={isCreating}
        />
      )}

      {/* Toggle Status Modal */}
      {toggleModalOpen && togglePackageId && (
        <BaseModal
          isOpen={toggleModalOpen}
          onClose={closeToggleModal}
          title="Change Package Status"
          size="sm"
          footer={
            <div className="flex gap-2 justify-end">
              <BaseButton
                variant="ghost"
                onClick={closeToggleModal}
                disabled={isTogglingStatus}
              >
                Cancel
              </BaseButton>
              <BaseButton
                variant="primary"
                onClick={confirmToggle}
                disabled={isTogglingStatus}
              >
                {isTogglingStatus ? 'Processing...' : 'Confirm'}
              </BaseButton>
            </div>
          }
        >
          {packages
            .filter((pkg) => pkg.id === togglePackageId)
            .map((pkg) => (
              <div key={pkg.id} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-900">
                    Package: <strong>{pkg.name}</strong>
                  </p>
                  <p className="text-sm text-blue-900 mt-1">
                    Current Status: <strong>{pkg.isActive ? 'Active' : 'Inactive'}</strong>
                  </p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium mb-2">
                    {pkg.isActive
                      ? `Deactivate "${pkg.name}"?`
                      : `Activate "${pkg.name}"?`}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {pkg.isActive
                      ? 'This package will no longer be available for purchase. Existing users can still use their credits.'
                      : 'This package will be available for purchase.'}
                  </p>
                </div>
              </div>
            ))}
        </BaseModal>
      )}
    </MainLayout>
  );
};

export default CreditPackages;
