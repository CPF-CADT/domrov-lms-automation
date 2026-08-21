import React, { useState } from "react";

export interface FileUploaderProps {
  presignedUrlEndpoint: string;
  notifyEndpoint?: string;
  token: string;
  resourceType?: string; // e.g., 'assignment' or 'submission'
  resourceId?: number; // parent ID
  onUploadSuccess?: (key: string) => void;
  onUploadError?: (error: string) => void;
}

interface PresignedResponse {
  uploadUrl: string;
  key: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  presignedUrlEndpoint,
  notifyEndpoint,
  token,
  resourceType,
  resourceId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedKey, setUploadedKey] = useState("");
  const [error, setError] = useState("");

  const getPresignedUrl = async (file: File): Promise<PresignedResponse> => {
    const params = new URLSearchParams({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    });

    if (resourceType) params.append("resourceType", resourceType);
    if (resourceId) params.append("resourceId", resourceId.toString());

    const res = await fetch(`${presignedUrlEndpoint}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to get presigned URL");
    return res.json();
  };

  const uploadFileToR2 = (file: File, uploadUrl: string) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.send(file);
    });

  const notifyBackend = async (key: string) => {
    if (!notifyEndpoint) return;

    const res = await fetch("http://localhost:3000/file/notify-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        key: key,
        filename: file?.name,
      }),
    });

    if (!res.ok) throw new Error("Failed to notify backend");
    return res.json();
  };

  const handleUpload = async () => {
    try {
      if (!file) throw new Error("Please select a file");
      setUploading(true);
      setError("");
      setProgress(0);
      setUploadedKey("");

      const { uploadUrl, key } = await getPresignedUrl(file);
      await uploadFileToR2(file, uploadUrl);
      if (notifyEndpoint) await notifyBackend(key);

      setUploadedKey(key);
      onUploadSuccess?.(key);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      onUploadError?.(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const selected = e.target.files?.[0] || null;
          setFile(selected);
          setProgress(0);
          setUploadedKey("");
          setError("");
        }}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {uploading && <p>Progress: {progress}%</p>}
      {uploadedKey && <p>Uploaded successfully: {uploadedKey}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
};
