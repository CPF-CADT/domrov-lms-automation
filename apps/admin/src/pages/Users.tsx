import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserTableFilters from '../components/users/UserTableFilters';
import UserTable from '../components/users/UserTable';
import { MainLayout, PageHeader } from '../components/layout';
import { PaginationControls } from '../components/base';
import { userService, type User } from '../services';
import { useModal, usePaginationWithPrefetch } from '../hooks';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { UserCreditReason } from '../types/admin-wallet';
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
  const navigate = useNavigate();
  const [currentSearch, setCurrentSearch] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>('all');
  const [currentRole, setCurrentRole] = useState<string>('all');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    navigate(`/users/${user.id}`);
  }, [navigate]);

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

  const tableHandlers = useMemo(() => ({
    onView: handleViewClick,
    onAddCredit: handleAddCreditClick,
    onDeductCredit: handleDeductCreditClick,
    onToggleStatus: handleStatusToggleClick,
  }), [handleViewClick, handleAddCreditClick, handleDeductCreditClick, handleStatusToggleClick]);

  const displayError = error || paginationError;

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
