import React, { useState } from 'react';
import { BaseModal, BaseButton } from '../base';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { type User } from '../../services';

interface StatusToggleModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (status: 'active' | 'inactive' | 'banned', reason?: string) => void;
  isSubmitting: boolean;
}

const StatusToggleModal: React.FC<StatusToggleModalProps> = ({
  isOpen,
  user,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive' | 'banned'>('inactive');
  const [reason, setReason] = useState('');

  if (!user) return null;

  const isCurrentlyActive = user.status?.toLowerCase() === 'active';
  const statusOptions: Array<{ value: 'active' | 'inactive' | 'banned'; label: string; description: string; icon: React.ReactNode }> = [
    {
      value: 'active',
      label: 'Active',
      description: 'User can access the system normally',
      icon: <Unlock className="w-5 h-5 text-green-600" />,
    },
    {
      value: 'inactive',
      label: 'Inactive',
      description: 'User will be suspended from the system',
      icon: <Lock className="w-5 h-5 text-yellow-600" />,
    },
    {
      value: 'banned',
      label: 'Banned',
      description: 'User will be permanently blocked',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    },
  ];

  const handleSubmit = () => {
    onSubmit(selectedStatus, reason || undefined);
    setSelectedStatus('inactive');
    setReason('');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Change User Status"
      size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <BaseButton
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant={selectedStatus === 'banned' ? 'danger' : selectedStatus === 'active' ? 'primary' : 'warning'}
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStatus === user.status?.toLowerCase()}
          >
            {isSubmitting ? 'Processing...' : 'Change Status'}
          </BaseButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            User: <strong>{user.firstName} {user.lastName}</strong> ({user.email})
          </p>
          <p className="text-sm text-blue-900 mt-1">
            Current Status: <strong className="capitalize">{user.status?.toLowerCase() || 'unknown'}</strong>
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            New Status
          </label>
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                disabled={isSubmitting}
                className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                  selectedStatus === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {option.icon}
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-600">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Reason (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a reason for this status change..."
            disabled={isSubmitting}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {selectedStatus !== user.status?.toLowerCase() && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-900">
              Status will change from <strong>{user.status?.toLowerCase()}</strong> to <strong>{selectedStatus}</strong>
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default StatusToggleModal;