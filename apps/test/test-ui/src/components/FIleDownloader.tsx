import React, { useState } from "react";

interface FileDownloaderProps {
  /** ID of the resource to download */
  resourceId: number;
  /** Your backend endpoint, e.g., http://localhost:3000/file/download/ */
  downloadEndpoint: string;
  /** JWT token for authorization */
  token: string;
}

export const FileDownloader: React.FC<FileDownloaderProps> = ({
  resourceId,
  downloadEndpoint,
  token,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setError("");
    setDownloading(true);
    setProgress(0);

    try {
      const url = `${downloadEndpoint}${resourceId}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "downloaded-file";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match?.[1]) filename = match[1];
      }

      // Trigger browser download
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      setDownloading(false);
    } catch (err: any) {
      setError(err.message || "Download failed");
      setDownloading(false);
    }
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={downloading}>
        {downloading ? `Downloading... ${progress}%` : "Download File"}
      </button>
      {error && <p style={{ color: "red" }}>Error: {error} </p>}
    </div>
  );
};
