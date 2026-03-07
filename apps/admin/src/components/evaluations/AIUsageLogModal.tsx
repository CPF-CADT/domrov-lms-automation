import React from 'react';
import { Cpu, Bot, CheckCircle } from 'lucide-react';
import { BaseModal, BaseButton } from '../base';
import { type AIUsageLog } from '../../services/aiEvaluationservice';

interface AIUsageLogModalProps {
    isOpen: boolean;
    log: AIUsageLog | null;
    onClose: () => void;
}

const AIUsageLogModal: React.FC<AIUsageLogModalProps> = ({
    isOpen,
    log,
    onClose,
}) => {
    if (!log) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`AI Usage Log #${log.id}`}
            size="lg"
            footer={
                <BaseButton variant="secondary" onClick={onClose}>
                    Close
                </BaseButton>
            }
        >
            <div className="space-y-6">
                {/* Common Info */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Total Tokens Used
                        </p>
                        <p className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                            <Bot className="w-6 h-6" />
                            {log.totalTokenCount.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Usage Date
                        </p>
                        <p className="text-gray-700">
                            {new Date(log.usingDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            User
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            {log.user.profilePictureUrl ? (
                                <img
                                    src={log.user.profilePictureUrl}
                                    alt={log.user.firstName}
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                    {log.user.firstName.charAt(0)}
                                </div>
                            )}
                            <p className="text-gray-900 font-medium">
                                {log.user.firstName} {log.user.lastName || ''}
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{log.user.email}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                            Account Status
                        </p>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                            {log.user.status.toLowerCase()}
                        </span>
                    </div>
                </div>

                <div className="space-y-4 border-t border-neutral-200 pt-6">
                    {/* Log Context / Description */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                            Log Title / Context
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed font-medium">
                            {log.title}
                        </p>
                    </div>

                    {/* Token Breakdown Info (Styled like Credit Package Info) */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-purple-600 uppercase mb-3 flex items-center gap-2">
                            <Cpu className="w-4 h-4" />
                            Token Breakdown
                        </p>
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-purple-600 font-medium mb-1">Input Tokens (Prompt)</p>
                                    <p className="text-gray-900 font-semibold">{log.inputTokenCount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-purple-600 font-medium mb-1">Output Tokens (Completion)</p>
                                    <p className="text-gray-900 font-semibold">{log.outputTokenCount.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-purple-200 mt-3 flex justify-between items-center">
                                <p className="text-xs text-purple-600 font-medium">Total Tokens Billed</p>
                                <p className="text-lg font-bold text-purple-700">
                                    {log.totalTokenCount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timestamp Verification Note */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-600">
                                System entry recorded on: {new Date(log.createdAt).toLocaleString('en-US')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default AIUsageLogModal;