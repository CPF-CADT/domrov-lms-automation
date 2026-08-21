"use client";

import { useRef, useState, useEffect } from "react";
import { Upload, FileText, Trash, Lock, ArrowLeft } from "lucide-react";
import submissionService from "@/services/submissionService";
import fileUploadService from "@/services/fileUploadService";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export interface UploadedFile {
  id?: string;
  name: string;
  size: string;
  uploadedAt: string;
  path?: string;
  type?: 'file' | 'link';
  url?: string;
  resourceId?: number;
}

interface UploadSectionProps {
  uploadedFiles: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemoved: (index: number) => void;
  onResourcesChanged?: (resources: { resourceId?: number }[]) => void;
  assignmentId?: string;
  submissionId?: number;
  submissionMethod?: string;
  onUploadComplete?: (data: unknown) => void;
  onFileClick?: (file: UploadedFile) => void;
  submissionStatus?: string;
  evaluationStatus?: boolean;
  onSubmissionStateChange?: () => void;
  isLoading?: boolean;
  isEditDisabled?: boolean;
}

/**
 * UploadSection - Drag and drop file upload area with file list and link support
 */
export default function UploadSection({
  uploadedFiles,
  onFilesAdded,
  onFileRemoved,
  onResourcesChanged,
  assignmentId = "default",
  submissionId,
  submissionMethod = "ANY",
  onUploadComplete,
  onFileClick,
  submissionStatus = "PENDING",
  evaluationStatus,
  onSubmissionStateChange,
  isEditDisabled = false
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>(
    submissionMethod === 'LINK' ? 'link' : 'file'
  );
  const [linkInput, setLinkInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUnsubmitting, setIsUnsubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ index: number; file: UploadedFile } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine allowed modes based on submission method
  const allowFileUpload = submissionMethod === 'ANY' || submissionMethod === 'FILE';
  const allowLinkSubmission = submissionMethod === 'ANY' || submissionMethod === 'LINK';
  const showModeSelector = submissionMethod === 'ANY';

  // Reset mode to file when all files are removed
  useEffect(() => {
    if (uploadedFiles.length === 0 && allowFileUpload) {
      setUploadMode('file');
    }
  }, [uploadedFiles.length, allowFileUpload]);

  const handleModeChange = (mode: 'file' | 'link') => {
    // Only allow one active submission, so clear the other type
    if (mode !== uploadMode) {
      setUploadMode(mode);
      if (mode === 'file') {
        // Clear link submissions when switching to file
        const removed = uploadedFiles.filter(f => f.type === 'link');
        if (removed.length > 0) {
          removed.forEach((_) => onFileRemoved(uploadedFiles.indexOf(_)));
        }
      } else {
        // Clear file submissions when switching to link
        const removed = uploadedFiles.filter(f => f.type !== 'link');
        if (removed.length > 0) {
          removed.forEach((_) => onFileRemoved(uploadedFiles.indexOf(_)));
        }
      }
    }
  };

  const handleUnsubmit = async () => {
    if (!assignmentId || assignmentId === "default") {
      setError("Cannot unsubmit: assignment ID is missing");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to unsubmit this assignment? You will be able to make changes and resubmit."
    );

    if (!confirmed) return;

    setIsUnsubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await submissionService.unsubmitSubmission(Number(assignmentId));
      console.log("Unsubmit successful:", result);

      // Notify parent to refresh submission data
      onSubmissionStateChange?.();

      setSuccessMessage("Assignment unsubmitted successfully. You can now make changes.");
    } catch (error: any) {
      console.error("Unsubmit error:", error);
      setError(error.message || "Failed to unsubmit. Please try again.");
    } finally {
      setIsUnsubmitting(false);
    }
  };

  const handleDeleteFile = (index: number, file: UploadedFile) => {
    setFileToDelete({ index, file });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete || !submissionId) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Remove from local state first
      onFileRemoved(fileToDelete.index);

      // Build the new resources array and sync with backend
      const remainingResources = uploadedFiles
        .filter((_, idx) => idx !== fileToDelete.index)
        .map(f => ({ resourceId: f.resourceId }));

      // Trigger backend sync
      onResourcesChanged?.(remainingResources);

      setSuccessMessage(`"${fileToDelete.file.name}" has been deleted successfully.`);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      setError(error.message || "Failed to delete file. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Check if submission ID is available
    if (!submissionId) {
      setError("Submission data is still loading. Please wait a moment and try again.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const uploadedFilesList: UploadedFile[] = [];
      const resources: { resourceId?: number }[] = [];

      // Upload each file to R2
      for (const file of files) {
        const uploadResponse = await fileUploadService.uploadFileFlow(
          file,
          'submission',
          submissionId,
          (progress) => {
            console.log(`Upload progress for ${file.name}: ${progress}%`);
          }
        );

        uploadedFilesList.push({
          name: file.name,
          size: formatFileSize(file.size),
          uploadedAt: 'Just now',
          path: uploadResponse.key,
          type: 'file',
          url: uploadResponse.key,
          resourceId: uploadResponse.resourceId,
        });

        // Add resourceId for submission update
        if (uploadResponse.resourceId) {
          resources.push({ resourceId: uploadResponse.resourceId });
        }
      }

      onFilesAdded(uploadedFilesList);

      // Update submission with all resources including new ones
      if (resources.length > 0) {
        onResourcesChanged?.(resources);
      }

      onUploadComplete?.({ files: uploadedFilesList });
      setSuccessMessage(`Successfully uploaded ${uploadedFilesList.length} file(s).`);
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkInput.trim()) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Notify backend of link submission
      const notifyResponse = await fileUploadService.notifyBackendOfUpload({
        key: linkInput,
        filename: linkInput,
      });

      const newLink: UploadedFile = {
        name: linkInput,
        size: 'Link',
        uploadedAt: 'Just now',
        type: 'link',
        url: linkInput,
        resourceId: notifyResponse.resourceId,
      };

      onFilesAdded([newLink]);

      // Update submission with the new resource
      if (notifyResponse.resourceId) {
        onResourcesChanged?.([{ resourceId: notifyResponse.resourceId }]);
      }

      setLinkInput('');
      setSuccessMessage('Link submitted successfully.');
      onUploadComplete?.({ link: newLink });
    } catch (error: any) {
      console.error('Link submission error:', error);
      setError(error.message || 'Link submission failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-4">Upload Your Work</h3>

      {/* Error Message Display */}
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

      {/* Success Message Display */}
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

      {/* GRADED/LOCKED STATE - Cannot do anything */}
      {evaluationStatus === true && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-900 mb-1">Assignment Graded</h4>
              <p className="text-sm text-amber-800 mb-4">
                This assignment has been graded and is now locked from further modifications.
              </p>
              <p className="text-xs text-amber-700">
                Please contact your instructor if you have questions about the grading or feedback.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBMITTED STATE - Show unsubmit option */}
      {submissionStatus === "SUBMITTED" && evaluationStatus !== true && uploadedFiles.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-green-900 mb-1">Assignment Submitted</h4>
              <p className="text-sm text-green-800 mb-4">
                Your submission has been received by your instructor. You can unsubmit to make changes before grading.
              </p>
              <p className="text-xs text-green-700">
                <strong>Note:</strong> Once graded, you will not be able to unsubmit or make changes.
              </p>
            </div>
            <button
              onClick={handleUnsubmit}
              disabled={isUnsubmitting}
              className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {isUnsubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unsubmitting...
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  Unsubmit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* NORMAL UPLOAD STATE - Show upload UI */}
      {(submissionStatus !== "SUBMITTED" || uploadedFiles.length === 0) && evaluationStatus !== true && (
        <>
          {/* Submission Loading State */}
          {!submissionId && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-yellow-900 font-medium">Loading submission data...</p>
            </div>
          )}

          {/* Submission Type Restriction Message - When not ANY */}
          {!showModeSelector && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium">
                {uploadMode === 'file' ? '📁 File uploads required for this assignment.' : '🔗 Link submissions required for this assignment.'}
              </p>
            </div>
          )}

          {/* Upload Mode Selector - Only for "ANY" method */}
          {showModeSelector && (
            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Submission Type</label>
              <select
                value={uploadMode}
                onChange={(e) => handleModeChange(e.target.value as 'file' | 'link')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="file">📁 Upload Files</option>
                <option value="link">🔗 Add Link</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">You can submit using either files or links, but only one type will be sent to the instructor.</p>
            </div>
          )}

          {/* File Upload Area */}
          {((uploadMode === 'file' && allowFileUpload) || uploadedFiles.length === 0) && (
            <div
              onDragEnter={!submissionId ? undefined : handleDragEnter}
              onDragOver={!submissionId ? undefined : handleDragOver}
              onDragLeave={!submissionId ? undefined : handleDragLeave}
              onDrop={!submissionId ? undefined : handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-6
                ${!submissionId ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60' : ''}
                ${submissionId && isDragging ? 'border-blue-500 bg-blue-50 cursor-pointer' : ''}
                ${submissionId && !isDragging ? 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer' : ''}
              `}
              onClick={!submissionId ? undefined : handleBrowseFiles}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                disabled={!submissionId}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">Drag and drop code files here</p>
                  <p className="text-xs text-slate-500">or <span className="text-blue-600 font-medium underline">browse from computer</span></p>
                </div>
                <p className="text-xs text-slate-400 mt-2">SUPPORTED: .PY, .JS, .ZIP, .PDF, .DOCX</p>
                {isUploading && (
                  <p className="text-sm text-blue-600 font-medium mt-2">Uploading...</p>
                )}
              </div>
            </div>
          )}

          {/* Link Input Area */}
          {(uploadMode === 'link' && allowLinkSubmission) && (
            <div className="border-2 border-slate-300 rounded-2xl p-6 mb-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  GitHub Repository, Google Drive, or Other Link
                </label>
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://github.com/username/repo or https://drive.google.com/..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUploading}
                />
                <button
                  onClick={handleAddLink}
                  disabled={!linkInput.trim() || isUploading || !submissionId}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? 'Adding...' : 'Add Link'}
                </button>
                <p className="text-xs text-slate-500">
                  Accepted: GitHub repos, Google Drive, Dropbox, OneDrive, or any public link
                </p>
              </div>
            </div>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                Your Work
              </h4>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => file.type === 'file' && onFileClick?.(file)}
                    className={`flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all group ${file.type === 'file' ? 'cursor-pointer hover:bg-blue-50' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${file.type === 'link' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                        {file.type === 'link' ? (
                          <span className="text-lg">🔗</span>
                        ) : (
                          <FileText className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {file.type === 'link' ? (
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {file.name}
                            </a>
                          ) : (
                            <>
                              {file.name}
                              <span className="ml-2 text-xs text-blue-600">Click to preview</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{file.size} • Uploaded {file.uploadedAt}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(index, file);
                      }}
                      disabled={isEditDisabled || deleteDialogOpen}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        title="Delete File"
        message={`Are you sure you want to delete "${fileToDelete?.file.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}
