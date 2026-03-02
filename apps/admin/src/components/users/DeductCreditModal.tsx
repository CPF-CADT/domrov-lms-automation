import React, { useState } from 'react';
import { BaseModal, BaseButton, BaseInput } from '../base';
import { type User } from '../../services';
import type { UserCreditReason } from '../../types/admin-wallet';
import { userService } from '../../services/userService';

type DeductReason = Extract<UserCreditReason, 'refund' | 'other'> | 'penalty' | 'correction';

const DEDUCT_REASONS: { value: DeductReason; label: string }[] = [
  { value: 'refund', label: 'Refund Reversal' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' },
];

interface DeductCreditModalProps {
  userId?: number;
  isOpen?: boolean;
  user?: User | null;
  onClose: () => void;
  onSubmit?: (amount: number, reason: DeductReason) => void;
  onSuccess?: () => void;
  isSubmitting?: boolean;
}

const DeductCreditModal: React.FC<DeductCreditModalProps> = ({
  userId,
  isOpen = true,
  user,
  onClose,
  onSubmit,
  onSuccess,
  isSubmitting = false,
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<DeductReason>('refund');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const numAmount = amount ? parseFloat(amount) : 0;
  const userBalance = user?.balance || 0;
  const isValid = numAmount > 0 && userBalance >= numAmount;

  const handleSubmit = async () => {
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    if (user && userBalance < numAmount) {
      setError(`Insufficient balance. Available: ${userBalance} credits`);
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      if (onSubmit) {
        // Old callback-based interface (from Users.tsx)
        onSubmit(numAmount, reason);
      } else if (userId) {
        // Direct API call (from UserDetail.tsx)
        await userService.deductCredits(userId, numAmount, reason);
        setAmount('');
        setReason('refund');
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deduct credits';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Support both old and new interface
  const shouldRender = user ? isOpen : (userId ? isOpen : false);

  return (
    <BaseModal
      isOpen={shouldRender}
      onClose={onClose}
      title="Deduct Credits"
      size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <BaseButton
            variant="ghost"
            onClick={onClose}
            disabled={submitting || isSubmitting}
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="danger"
            onClick={handleSubmit}
            disabled={
              submitting ||
              isSubmitting ||
              (!user && !userId) ||
              !isValid ||
              !reason
            }
          >
            {submitting || isSubmitting ? 'Processing...' : 'Deduct Credits'}
          </BaseButton>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        {user && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-900">
              User: <strong>{user.firstName} {user.lastName}</strong> ({user.email})
            </p>
            <p className="text-sm text-blue-900 mt-1">
              Current Balance: <strong>{userBalance} credits</strong>
            </p>
          </div>
        )}

        <BaseInput
          label="Amount to Deduct"
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          placeholder="Enter positive amount"
          min="0"
          step="1"
          disabled={submitting || isSubmitting}
        />

        {amount && numAmount > 0 && user && numAmount > userBalance && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-900">
              ⚠️ Insufficient balance. Available: {userBalance} credits
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DeductReason)}
            disabled={submitting || isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DEDUCT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {user && amount && numAmount > 0 && isValid && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-900">
              New Balance: <strong>{userBalance - numAmount} credits</strong>
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default DeductCreditModal;