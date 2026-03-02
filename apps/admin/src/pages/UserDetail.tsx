import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Plus, Minus } from 'lucide-react';
import { MainLayout } from '../components/layout';
import { BaseCard, BaseButton, BaseModal } from '../components/base';
import { userService } from '../services/userService';
import { creditPackageService } from '../services/creditPackageService';
import type { UserDetailDto } from '../types/admin-users';
import type { TransactionResponseDto } from '../types/admin-wallet';
import AddCreditModal from '../components/users/AddCreditModal';
import DeductCreditModal from '../components/users/DeductCreditModal';
import '../App.css';

interface UserDetails extends UserDetailDto {
  status?: string;
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [showDeductCreditModal, setShowDeductCreditModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUserDetails = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUserDetails(parseInt(userId));
      setUser(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user details';
      setError(errorMessage);
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  const handleAddCreditSuccess = async () => {
    setShowAddCreditModal(false);
    setSuccess('Credits added successfully');
    await loadUserDetails();
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeductCreditSuccess = async () => {
    setShowDeductCreditModal(false);
    setSuccess('Credits deducted successfully');
    await loadUserDetails();
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !user) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Users
          </button>
          <BaseCard>
            <div className="text-center py-8">
              <p className="text-red-600 font-semibold">{error || 'User not found'}</p>
              <BaseButton
                onClick={() => navigate('/users')}
                className="mt-4 bg-blue-600"
              >
                Return to Users
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </MainLayout>
    );
  }

  const normalizeStatus = (status: string) => {
    return status?.toLowerCase?.() || 'unknown';
  };

  const getStatusColor = (status: string): string => {
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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg flex items-center justify-between">
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* User Information Card */}
        <BaseCard className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Side - Basic Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="text-gray-900 font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="text-gray-900 font-medium">{user.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Role</p>
                  <p className="text-gray-900 font-medium capitalize">{user.role}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                    {normalizeStatus(user.status)}
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
                    {new Date(user.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Last Activity</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(user.lastActivity).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Verification Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {user.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Gender</p>
                  <p className="text-gray-900 font-medium">{user.gender || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        {/* Credits Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Credit Balance</h2>
              <p className="text-4xl font-bold text-green-600">{user.credits}</p>
              <p className="text-gray-500 text-sm mt-2">Total Spent: ${user.totalSpent}</p>
            </div>
            <div className="flex gap-3">
              <BaseButton
                onClick={() => setShowAddCreditModal(true)}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Add Credits
              </BaseButton>
              <BaseButton
                onClick={() => setShowDeductCreditModal(true)}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <Minus size={20} />
                Deduct Credits
              </BaseButton>
            </div>
          </div>
        </div>

        {/* Purchased Packages Section */}
        <BaseCard className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Purchased Packages</h2>
          {user.purchasedPackages && user.purchasedPackages.length > 0 ? (
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
                  {user.purchasedPackages.map((pkg) => (
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
          {user.recentTransactions && user.recentTransactions.length > 0 ? (
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
                  {user.recentTransactions.map((txn) => (
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
      </div>

      {/* Modals */}
      {showAddCreditModal && (
        <AddCreditModal
          userId={user.id}
          onClose={() => setShowAddCreditModal(false)}
          onSuccess={handleAddCreditSuccess}
        />
      )}

      {showDeductCreditModal && (
        <DeductCreditModal
          userId={user.id}
          onClose={() => setShowDeductCreditModal(false)}
          onSuccess={handleDeductCreditSuccess}
        />
      )}
    </MainLayout>
  );
}
