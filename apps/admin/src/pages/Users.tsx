import React, { useState, useEffect, useCallback, useMemo } from 'react';
import UserTableFilters from '../components/users/UserTableFilters';
import UserTable from '../components/users/UserTable';
import { MainLayout, PageHeader } from '../components/layout';
import { PaginationControls, BaseCard, BaseButton } from '../components/base';
import { userService, type User } from '../services';
import { useModal, usePaginationWithPrefetch } from '../hooks';
import { AlertCircle, CheckCircle, ArrowLeft, Plus, Minus } from 'lucide-react';
import type { UserCreditReason } from '../types/admin-wallet';
import type { UserDetailDto } from '../types/admin-users';
import AddCreditModal from '../components/users/AddCreditModal';
import DeductCreditModal from '../components/users/DeductCreditModal';
import StatusToggleModal from '../components/users/StatusToggleModal';

type DeductReason = Extract<UserCreditReason, 'refund' | 'other'> | 'penalty' | 'correction';
const PAGE_SIZE = 10;

const useDebounce = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const MemoizedUserTable = React.memo(UserTable);

interface FiltersSectionProps {
  search: string;
  roleFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

const FiltersSection = React.memo<FiltersSectionProps>(({
  search,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}) => (
  <div className="mb-3 flex-shrink-0">
    <UserTableFilters
      search={search}
      onSearchChange={onSearchChange}
      roleFilter={roleFilter}
      onRoleChange={onRoleChange}
      statusFilter={statusFilter}
      onStatusChange={onStatusChange}
    />
  </div>
));
FiltersSection.displayName = 'FiltersSection';

interface PaginationSectionProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  isLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

const PaginationSection = React.memo<PaginationSectionProps>(({
  currentPage,
  totalPages,
  totalRecords,
  isLoading,
  onPrevPage,
  onNextPage,
  onGoToPage,
}) => {
  if (totalPages === 0) return null;

  return (
    <div className="flex-shrink-0">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={PAGE_SIZE}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onGoToPage={onGoToPage}
        isLoading={isLoading}
      />
    </div>
  );
});
PaginationSection.displayName = 'PaginationSection';

const Users = () => {
  const [currentSearch, setCurrentSearch] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>('all');
  const [currentRole, setCurrentRole] = useState<string>('all');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for inline user detail view
  const [viewedUserId, setViewedUserId] = useState<number | null>(null);
  const [viewedUserData, setViewedUserData] = useState<UserDetailDto | null>(null);
  const [loadingViewedUser, setLoadingViewedUser] = useState(false);
  const [viewedUserError, setViewedUserError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(currentSearch, 500);

  const addCreditModal = useModal();
  const deductCreditModal = useModal();
  const statusModal = useModal();

  const transformUserData = (user: any): User => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName || null,
    email: user.email,
    profilePictureUrl: user.profilePictureUrl,
    avatar: user.profilePictureUrl || undefined,
    name: `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`,
    role: user.role,
    balance: user.credits,
    credits: user.credits,
    status: user.status,
    created: user.joinDate,
    isVerified: user.isVerified,
    gender: user.gender || null,
    dob: user.dob || null,
    phoneNumber: user.phoneNumber || null,
    joinDate: user.joinDate,
    lastActivity: user.lastActivity,
    totalPurchased: user.totalPurchased,
  });

  const fetchUsersWithParams = useCallback(
    async (page: number, limit: number) => {
      const response = await userService.fetchUsers(
        page,
        limit,
        {
          status: currentStatus,
          role: currentRole,
          verified: 'all',
          search: debouncedSearch || '',
          sortBy: 'newest',
        }
      );

      return {
        data: (response.data || []).map(transformUserData),
        total: response.total || 0,
      };
    },
    [currentStatus, currentRole, debouncedSearch]
  );

  const {
    currentData: users,
    isLoading,
    error: paginationError,
    totalRecords,
    totalPages,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    prefetchPage,
  } = usePaginationWithPrefetch(
    fetchUsersWithParams,
    PAGE_SIZE,
    [currentStatus, currentRole, debouncedSearch]
  );

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    goToPage(1);
  }, [debouncedSearch, currentStatus, currentRole, goToPage]);

  useEffect(() => {
    if (currentPage < totalPages) {
      prefetchPage(currentPage + 1);
    }
  }, [currentPage, totalPages, prefetchPage]);

  const handleSearch = useCallback((value: string) => {
    setCurrentSearch(value);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setCurrentStatus(value);
  }, []);

  const handleRoleFilter = useCallback((value: string) => {
    setCurrentRole(value);
  }, []);

  const handleGoToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    goToPage(validPage);
  }, [totalPages, goToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      nextPage();
    }
  }, [currentPage, totalPages, nextPage]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      prevPage();
    }
  }, [currentPage, prevPage]);

  const handleViewClick = useCallback((user: User) => {
    const loadUserDetail = async () => {
      setLoadingViewedUser(true);
      setViewedUserError(null);
      try {
        const data = await userService.getUserDetails(user.id);
        setViewedUserData(data);
        setViewedUserId(user.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load user details';
        setViewedUserError(errorMessage);
        console.error('Error loading user:', err);
      } finally {
        setLoadingViewedUser(false);
      }
    };
    loadUserDetail();
  }, []);

  const handleAddCreditClick = useCallback((user: User) => {
    setSelectedUser(user);
    addCreditModal.openModal();
  }, [addCreditModal]);

  const handleDeductCreditClick = useCallback((user: User) => {
    setSelectedUser(user);
    deductCreditModal.openModal();
  }, [deductCreditModal]);

  const handleStatusToggleClick = useCallback((user: User) => {
    setSelectedUser(user);
    statusModal.openModal();
  }, [statusModal]);

  const handleAddCredit = useCallback(async (amount: number, reason: UserCreditReason) => {
    if (!selectedUser || amount <= 0) return;
    try {
      setIsSubmitting(true);
      setError(null);

      await userService.addCredits(
        selectedUser.id,
        amount,
        reason,
        `Admin added ${amount} credits`
      );

      await goToPage(currentPage);
      setSuccessMessage(
        `Added ${amount} credits to ${selectedUser.firstName}`
      );
      addCreditModal.closeModal();
      setSelectedUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add credits. Please try again.';
      setError(errorMsg);
      console.error('Add credits error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, currentPage, goToPage, addCreditModal]);

  const handleDeductCredit = useCallback(async (amount: number, reason: DeductReason) => {
    if (!selectedUser || amount <= 0) return;
    try {
      setIsSubmitting(true);
      setError(null);

      await userService.deductCredits(
        selectedUser.id,
        amount,
        reason,
        `Admin deducted ${amount} credits`
      );

      await goToPage(currentPage);
      setSuccessMessage(
        `Deducted ${amount} credits from ${selectedUser.firstName}`
      );
      deductCreditModal.closeModal();
      setSelectedUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deduct credits. Please try again.';
      setError(errorMsg);
      console.error('Deduct credits error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, currentPage, goToPage, deductCreditModal]);

  const handleStatusToggle = useCallback(async (status: 'active' | 'inactive' | 'banned', reason?: string) => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      setError(null);

      await userService.toggleUserStatus(selectedUser.id, status, reason);

      await goToPage(currentPage);
      setSuccessMessage(`User status changed to ${status}`);
      statusModal.closeModal();
      setSelectedUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to change user status. Please try again.';
      setError(errorMsg);
      console.error('Toggle status error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, currentPage, goToPage, statusModal]);

  const normalizeStatus = (status: string | undefined) => {
    return status?.toLowerCase?.() || 'unknown';
  };

  const getStatusColor = (status: string | undefined): string => {
    const normalizedStatus = normalizeStatus(status);
    const statusMap: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      banned: 'bg-red-100 text-red-800',
      verified: 'bg-green-100 text-green-800',
      unverified: 'bg-yellow-100 text-yellow-800',
    };
    return statusMap[normalizedStatus] || 'bg-gray-100 text-gray-800';
  };

  const handleAddCreditFromDetail = useCallback(async (amount: number, reason: UserCreditReason) => {
    if (!viewedUserData || amount <= 0) return;
    try {
      setIsSubmitting(true);
      setError(null);

      await userService.addCredits(
        viewedUserData.id,
        amount,
        reason,
        `Admin added ${amount} credits`
      );

      // Reload the viewed user data
      const updatedData = await userService.getUserDetails(viewedUserData.id);
      setViewedUserData(updatedData);
      setSuccessMessage(`Added ${amount} credits to ${viewedUserData.firstName}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add credits. Please try again.';
      setError(errorMsg);
      console.error('Add credits error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [viewedUserData]);

  const handleDeductCreditFromDetail = useCallback(async (amount: number, reason: DeductReason) => {
    if (!viewedUserData || amount <= 0) return;
    try {
      setIsSubmitting(true);
      setError(null);

      await userService.deductCredits(
        viewedUserData.id,
        amount,
        reason,
        `Admin deducted ${amount} credits`
      );

      // Reload the viewed user data
      const updatedData = await userService.getUserDetails(viewedUserData.id);
      setViewedUserData(updatedData);
      setSuccessMessage(`Deducted ${amount} credits from ${viewedUserData.firstName}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deduct credits. Please try again.';
      setError(errorMsg);
      console.error('Deduct credits error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [viewedUserData]);

  const handleBackFromDetail = () => {
    setViewedUserId(null);
    setViewedUserData(null);
    setViewedUserError(null);
  };

  const tableHandlers = useMemo(() => ({
    onView: handleViewClick,
    onAddCredit: handleAddCreditClick,
    onDeductCredit: handleDeductCreditClick,
    onToggleStatus: handleStatusToggleClick,
  }), [handleViewClick, handleAddCreditClick, handleDeductCreditClick, handleStatusToggleClick]);

  const displayError = error || paginationError;

  // Show user detail view instead of table
  if (viewedUserId) {
    return (
      <MainLayout>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0">
            <button
              onClick={handleBackFromDetail}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
            >
              <ArrowLeft size={20} />
              Back to Users
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto pr-4">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg flex items-center justify-between flex-shrink-0">
                <span>{successMessage}</span>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-600 hover:text-green-700"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error Message */}
            {viewedUserError && (
              <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg flex items-center justify-between flex-shrink-0">
                <span>{viewedUserError}</span>
                <button
                  onClick={() => setViewedUserError(null)}
                  className="text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Loading State */}
            {loadingViewedUser && (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* User Detail Content */}
            {viewedUserData && !loadingViewedUser && (
              <>
                {/* Header with name */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {viewedUserData.firstName} {viewedUserData.lastName}
                  </h1>
                </div>

                {/* User Information Card */}
                <BaseCard className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Side - Basic Info */}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-500 text-sm">Email</p>
                          <p className="text-gray-900 font-medium">{viewedUserData.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Phone</p>
                          <p className="text-gray-900 font-medium">{viewedUserData.phoneNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Role</p>
                          <p className="text-gray-900 font-medium capitalize">{viewedUserData.role}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewedUserData.status)}`}>
                            {normalizeStatus(viewedUserData.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Dates & Verification */}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Details</h2>
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-500 text-sm">Join Date</p>
                          <p className="text-gray-900 font-medium">
                            {new Date(viewedUserData.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Last Activity</p>
                          <p className="text-gray-900 font-medium">
                            {new Date(viewedUserData.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Verification Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${viewedUserData.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {viewedUserData.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Gender</p>
                          <p className="text-gray-900 font-medium">{viewedUserData.gender || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </BaseCard>

                {/* Credits Section */}
                <div className="mb-8">
                  <BaseCard>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Credit Balance</h2>
                        <p className="text-4xl font-bold text-green-600">{viewedUserData.credits}</p>
                        <p className="text-gray-500 text-sm mt-2">Total Spent: ${viewedUserData.totalSpent}</p>
                      </div>
                      <div className="flex gap-3">
                        <BaseButton
                          onClick={() => addCreditModal.openModal()}
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                        >
                          <Plus size={20} />
                          Add Credits
                        </BaseButton>
                        <BaseButton
                          onClick={() => deductCreditModal.openModal()}
                          className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                        >
                          <Minus size={20} />
                          Deduct Credits
                        </BaseButton>
                      </div>
                    </div>
                  </BaseCard>
                </div>

                {/* Purchased Packages Section */}
                <BaseCard className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Purchased Packages</h2>
                  {viewedUserData.purchasedPackages && viewedUserData.purchasedPackages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Package Name</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Credits</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Bonus</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Purchase Date</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewedUserData.purchasedPackages.map((pkg) => (
                            <tr key={pkg.packageId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900">{pkg.packageName}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{pkg.credits}</td>
                              <td className="px-6 py-4 text-sm text-purple-600 font-medium">+{pkg.bonusCredits}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {pkg.price} {pkg.currency}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(pkg.purchaseDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pkg.paymentStatus)}`}>
                                  {pkg.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No packages purchased yet</p>
                  )}
                </BaseCard>

                {/* Transaction History Section */}
                <BaseCard>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h2>
                  {viewedUserData.recentTransactions && viewedUserData.recentTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Balance Before</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Balance After</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewedUserData.recentTransactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{txn.id}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-purple-600">{txn.amount}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize">{txn.reason}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{txn.balanceBefore}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{txn.balanceAfter}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(txn.date).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No recent transactions</p>
                  )}
                </BaseCard>
              </>
            )}
          </div>
        </div>

        {/* Modals for credit operations */}
        <AddCreditModal
          user={selectedUser}
          isOpen={addCreditModal.isOpen}
          isSubmitting={isSubmitting}
          onClose={addCreditModal.closeModal}
          onSubmit={handleAddCreditFromDetail}
        />

        <DeductCreditModal
          user={selectedUser}
          isOpen={deductCreditModal.isOpen}
          isSubmitting={isSubmitting}
          onClose={deductCreditModal.closeModal}
          onSubmit={handleDeductCreditFromDetail}
        />
      </MainLayout>
    );
  }

  // Default table view
  return (
    <MainLayout>
      <PageHeader
        title="Users"
        description="Manage system users and their access levels."
      />

      {displayError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <FiltersSection
        search={currentSearch || ''}
        roleFilter={currentRole || ''}
        statusFilter={currentStatus || ''}
        onSearchChange={handleSearch}
        onRoleChange={handleRoleFilter}
        onStatusChange={handleStatusFilter}
      />

      <div className="flex-1 flex flex-col min-h-0 mb-3">
        <div className="overflow-y-auto">
          <MemoizedUserTable
            users={users}
            isLoading={isLoading}
            {...tableHandlers}
          />
        </div>
      </div>

      <PaginationSection
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        isLoading={isLoading}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onGoToPage={handleGoToPage}
      />

      <AddCreditModal
        user={selectedUser}
        isOpen={addCreditModal.isOpen}
        isSubmitting={isSubmitting}
        onClose={addCreditModal.closeModal}
        onSubmit={handleAddCredit}
      />

      <DeductCreditModal
        user={selectedUser}
        isOpen={deductCreditModal.isOpen}
        isSubmitting={isSubmitting}
        onClose={deductCreditModal.closeModal}
        onSubmit={handleDeductCredit}
      />

      <StatusToggleModal
        user={selectedUser}
        isOpen={statusModal.isOpen}
        isSubmitting={isSubmitting}
        onClose={statusModal.closeModal}
        onSubmit={handleStatusToggle}
      />
    </MainLayout>
  );
};

export default Users;
