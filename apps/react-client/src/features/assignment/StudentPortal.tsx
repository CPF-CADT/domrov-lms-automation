"use client";

import { CheckCircle, ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import submissionService from "@/services/submissionService";
import Dialog from "@/components/Dialog";
import UploadSection from "./UploadSection";
import type { UploadedFile } from "./UploadSection";

interface StudentPortalProps {
  status: string;
  progress: { current: number; total: number };
  progressPercent: number;
  submittedAt?: string;
  uploadedFiles: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemoved: (index: number) => void;
  onResourcesChanged?: (resources: { resourceId?: number }[]) => void;
  assignmentId?: string;
  submissionId?: number;
  submissionMethod?: string;
  onUploadComplete?: (data: unknown) => void;
  onFileClick?: (file: UploadedFile) => void;
  evaluationStatus?: boolean;
  isEditDisabled?: boolean;
  isLoading?: boolean;
  onSubmissionStateChange?: () => void;
}

/**
 * StudentPortal - Complete student portal with progress, upload, and help sections
 */
export default function StudentPortal({
  status,
  progress: _progress,
  progressPercent: _progressPercent,
  submittedAt,
  uploadedFiles,
  onFilesAdded,
  onFileRemoved,
  onResourcesChanged,
  assignmentId = "default",
  submissionId,
  submissionMethod = "ANY",
  onUploadComplete,
  onFileClick,
  evaluationStatus,
  isEditDisabled = false,
  isLoading = false,
  onSubmissionStateChange
}: StudentPortalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'submit' | 'unsubmit' | null>(null);

  const executeUnsubmit = async () => {
    if (!submissionId) {
      setError("Submission ID is missing. Cannot unsubmit.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await submissionService.unsubmitSubmission(submissionId);
      console.log("Unsubmit successful:", result);
      setSuccessMessage("Assignment unsubmitted successfully! You can now edit it again.");

      // Refresh parent component
      onSubmissionStateChange?.();
    } catch (err: any) {
      console.error("Unsubmit error:", err);
      setError(err.response?.data?.message || err.message || "Failed to unsubmit assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeSubmit = async () => {
    if (!assignmentId || assignmentId === "default") {
      setError("Assignment ID is missing. Cannot submit.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await submissionService.submitSubmission(Number(assignmentId));
      console.log("Submission successful:", result);
      setSuccessMessage("Assignment submitted successfully!");

      // Refresh parent component
      onSubmissionStateChange?.();
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.response?.data?.message || err.message || "Failed to submit assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubmit = () => {
    setDialogAction('unsubmit');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    setDialogAction('submit');
    setDialogOpen(true);
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6 mt-8">
      {/* Status Banner */}
      <div className="px-6 pt-6 pb-3">
        {evaluationStatus === true ? (
          <div className="bg-gradient-to-r from-purple-50 to-purple-50 border-l-4 border-purple-500 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full" />
              <h3 className="text-sm font-bold text-purple-900">Assignment Graded</h3>
            </div>
            <p className="text-xs text-purple-700">This assignment has been graded and is now locked from further modifications.</p>
          </div>
        ) : status === "LATE" ? (
          <div className="bg-gradient-to-r from-orange-50 to-orange-50 border-l-4 border-orange-500 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full" />
              <h3 className="text-sm font-bold text-orange-900">Submitted Late</h3>
            </div>
            <p className="text-xs text-orange-700">Your submission was received after the due date and may incur a penalty.</p>
          </div>
        ) : status === "SUBMITTED" ? (
          <div className="bg-gradient-to-r from-blue-50 to-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              <h3 className="text-sm font-bold text-blue-900">Submitted - Awaiting Grade</h3>
            </div>
            <p className="text-xs text-blue-700">Your assignment has been submitted successfully and is under review.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-50 to-slate-50 border-l-4 border-slate-400 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-slate-600 rounded-full" />
              <h3 className="text-sm font-bold text-slate-900">Ready to Submit</h3>
            </div>
            <p className="text-xs text-slate-700">Upload your work and submit when ready. You can edit before submitting.</p>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="p-6">
        <UploadSection
          uploadedFiles={uploadedFiles}
          onFilesAdded={onFilesAdded}
          onFileRemoved={onFileRemoved}
          onResourcesChanged={onResourcesChanged}
          assignmentId={assignmentId}
          submissionId={submissionId}
          submissionMethod={submissionMethod}
          onUploadComplete={onUploadComplete}
          onFileClick={onFileClick}
          submissionStatus={status}
          evaluationStatus={evaluationStatus}
          isEditDisabled={isEditDisabled}
          isLoading={isLoading}
          onSubmissionStateChange={onSubmissionStateChange}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-red-600 hover:text-red-800 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-green-900 mb-1">Success</h4>
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="shrink-0 text-green-600 hover:text-green-800 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Submission Status */}
        {(status === "SUBMITTED" || status === "LATE") && submittedAt && (
          <div className={`rounded-xl p-4 mb-6 mt-6 border ${status === "LATE" ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-start gap-3">
              <CheckCircle className={`w-5 h-5 mt-0.5 shrink-0 ${status === "LATE" ? "text-orange-600" : "text-green-600"}`} />
              <div>
                <h4 className={`text-sm font-bold mb-1 ${status === "LATE" ? "text-orange-900" : "text-green-900"}`}>
                  {status === "LATE" ? "Submission Received (Late)" : "Submission Received"}
                </h4>
                <p className={`text-xs ${status === "LATE" ? "text-orange-700" : "text-green-700"}`}>Time: {submittedAt}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Unsubmit (shown when already submitted) */}
        {evaluationStatus !== true && (status === "SUBMITTED" || status === "LATE") && (
          <div className="space-y-3 mb-6 mt-6">
            <button
              onClick={handleUnsubmit}
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-linear-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:shadow-none flex items-center justify-center gap-2 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Unsubmitting...</span>
                </>
              ) : (
                <>
                  <span>Unsubmit Assignment</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Action Buttons - Submit (shown when not yet submitted) */}
        {evaluationStatus !== true && status !== "SUBMITTED" && status !== "LATE" && (
          <div className="space-y-3 mb-6 mt-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || uploadedFiles.length === 0}
              className="w-full px-6 py-4 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none flex items-center justify-center gap-2 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Assignment</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            {uploadedFiles.length === 0 && (
              <p className="text-xs text-slate-500 text-center">Upload files first before submitting</p>
            )}
          </div>
        )}

        {/* Need Help Section */}
        <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-xl p-6">
          <h4 className="text-base font-bold text-white mb-2">Need Help?</h4>
          <p className="text-sm text-slate-300 mb-4">If you encounter issues during upload, please contact our support team immediately.</p>
          <button className="w-full px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
            <Info className="w-5 h-5" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogAction === 'submit' ? 'Submit Assignment' : 'Unsubmit Assignment'}
        description={
          dialogAction === 'submit'
            ? 'Are you sure you want to submit this assignment? You can only unsubmit before grading.'
            : 'Are you sure you want to unsubmit this assignment? You can edit it again after unsubmitting.'
        }
        buttons={[
          {
            label: 'Cancel',
            onClick: () => setDialogOpen(false),
            variant: 'secondary',
          },
          {
            label: dialogAction === 'submit' ? 'Submit' : 'Unsubmit',
            onClick: () => {
              setDialogOpen(false);
              if (dialogAction === 'submit') {
                executeSubmit();
              } else {
                executeUnsubmit();
              }
            },
            variant: dialogAction === 'submit' ? 'primary' : 'danger',
            disabled: isSubmitting,
          },
        ]}
      />
    </div>
  );
}
