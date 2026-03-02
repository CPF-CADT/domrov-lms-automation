import React, { useState } from 'react';
import { BaseModal, BaseButton, BaseInput } from '../base';
import { type User } from '../../services';
import type { UserCreditReason } from '../../types/admin-wallet';
import { userService } from '../../services/userService';

const CREDIT_REASONS: { value: UserCreditReason; label: string }[] = [
  { value: 'bonus', label: 'Bonus' },
  { value: 'refund', label: 'Refund' },
  { value: 'promo', label: 'Promotional' },
  { value: 'other', label: 'Other' },
];

interface AddCreditModalProps {
  userId?: number;
  isOpen?: boolean;
  user?: User | null;
  onClose: () => void;
  onSubmit?: (amount: number, reason: UserCreditReason) => void;
  onSuccess?: () => void;
  isSubmitting?: boolean;
}

const AddCreditModal: React.FC<AddCreditModalProps> = ({
  userId,
  isOpen = true,
  user,
  onClose,
  onSubmit,
  onSuccess,
  isSubmitting = false,
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<UserCreditReason>('bonus');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!reason) {
      setError('Please select a reason');
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
        await userService.addCredits(userId, numAmount, reason);
        setAmount('');
        setReason('bonus');
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add credits';
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
      title="Add Credits"
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
            variant="primary"
            onClick={handleSubmit}
            disabled={
              submitting ||
              isSubmitting ||
              !amount ||
              parseFloat(amount) <= 0 ||
              !reason
            }
          >
            {submitting || isSubmitting ? 'Processing...' : 'Add Credits'}
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
              Current Balance: <strong>{user.balance || 0} credits</strong>
            </p>
          </div>
        )}

        <BaseInput
          label="Amount to Add"
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

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as UserCreditReason)}
            disabled={submitting || isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CREDIT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {user && amount && parseFloat(amount) > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-900">
              New Balance: <strong>{(user.balance || 0) + parseFloat(amount)} credits</strong>
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default AddCreditModal;