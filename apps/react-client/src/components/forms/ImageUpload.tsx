"use client";

import { useState, useRef, useCallback } from "react";
import fileService from "@/services/fileService";
import type { CloudinaryUploadResponse } from "@/types";

interface ImageUploadProps {
    /** Callback when image is successfully uploaded */
    onSuccess?: (result: CloudinaryUploadResponse) => void;
    /** Callback when upload fails */
    onError?: (error: string) => void;
    /** Current image URL (for preview) */
    currentImageUrl?: string;
    /** Max file size in MB (default: 10) */
    maxSizeMB?: number;
    /** Class name for container */
    className?: string;
    /** Label text */
    label?: string;
}

export default function ImageUpload({
    onSuccess,
    onError,
    currentImageUrl,
    maxSizeMB = 10,
    className = "",
    label = "Upload Image",
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>(currentImageUrl || "");
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file");
                return;
            }

            // Validate file size
            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(`File size must be less than ${maxSizeMB}MB`);
                return;
            }

            setSelectedFile(file);
            setError("");
            setUploadedUrl(null);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        },
        [maxSizeMB]
    );

    const handleUpload = useCallback(async () => {
        if (!selectedFile) {
            setError("Please select an image first");
            return;
        }

        setError("");
        setUploading(true);
        setProgress(0);

        try {
            // Step 1: Get presigned URL parameters
            setProgress(30);
            const params = await fileService.getCloudinaryPresignedUrl();

            // Step 2: Upload to Cloudinary
            setProgress(60);
            const result = await fileService.uploadToCloudinary(selectedFile, params);

            setProgress(100);
            setUploadedUrl(result.secure_url);

            // Reset selected file
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // Call success callback
            onSuccess?.(result);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Upload failed";
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setUploading(false);
        }
    }, [selectedFile, onSuccess, onError]);

    const handleCancel = useCallback(() => {
        setSelectedFile(null);
        setPreview(currentImageUrl || "");
        setError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [currentImageUrl]);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
                // Simulate input change
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                if (fileInputRef.current) {
                    fileInputRef.current.files = dataTransfer.files;
                    handleFileSelect({
                        target: { files: dataTransfer.files },
                    } as React.ChangeEvent<HTMLInputElement>);
                }
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }, []);

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    {label}
                </label>
            )}

            {/* Drop Zone / Preview */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !uploading && !selectedFile && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg transition-colors ${uploading || selectedFile
                    ? "border-slate-300 bg-slate-50"
                    : "border-slate-300 hover:border-primary hover:bg-slate-50 cursor-pointer"
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                />

                {preview ? (
                    <div className="relative aspect-video flex items-center justify-center p-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-48 max-w-full object-contain rounded-lg"
                        />
                        {!uploading && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                    Click to change image
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                        <svg
                            className="w-12 h-12 text-slate-400 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="text-sm text-slate-600 text-center">
                            <span className="font-medium text-primary">Click to upload</span>{" "}
                            or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            PNG, JPG, GIF up to {maxSizeMB}MB
                        </p>
                    </div>
                )}
            </div>

            {/* File Info */}
            {selectedFile && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center shrink-0">
                                <svg
                                    className="w-5 h-5 text-slate-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        {!uploading && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel();
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {uploading && (
                <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {selectedFile && !uploading && (
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        onClick={handleUpload}
                        className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Upload
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {uploadedUrl && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-5 h-5 text-green-600 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        <p className="text-sm text-green-700">Image uploaded successfully!</p>
                    </div>
                </div>
            )}
        </div>
    );
}
