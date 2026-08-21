import { useEffect, useState } from "react";
import { FolderIcon, FileIcon } from "lucide-react";
import fileService from "@/services/fileService";

// Fallback saveAs implementation for file-saver compatibility
const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

interface Folder {
  id: string;
  name: string;
  fileCount: number;
  type: string;
}

interface File {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
}

interface FilesTabProps {
  classId: string;
}

/**
 * FilesTab - File management and sharing view.
 */
export default function FilesTab({ classId: _classId }: FilesTabProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {

        await fileService.getPresignedUrl({
          filename: "example.txt",
          contentType: "application/pdf",
          resourceType: "class",
          resourceId: parseInt(_classId),
        });

        // Simulate folder and file data
        setFolders([{ id: "1", name: "Example Folder", fileCount: 1, type: "folder" }]); // Replace with actual folder data if available
        setFiles([
          { id: "1", name: "example.txt", size: "1 MB", uploadDate: "2026-03-22" },
        ]);
      } catch (error) {
        console.error("Error fetching files and folders:", error);
      }
    }

    fetchData();
  }, [_classId]);

  const handleDownload = async (resourceId: number) => {
    try {
      const blob = await fileService.downloadFile(resourceId);
      saveAs(blob, "downloaded-file.pdf");
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Class Files</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Upload File
          </button>
        </div>

        {/* Folders */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Folders</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FolderIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{folder.name}</h4>
                    <p className="text-xs text-slate-500">{folder.fileCount} files</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Recent Files</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">{file.name}</h4>
                    <p className="text-xs text-slate-500">
                      {file.size} • {file.uploadDate}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(parseInt(file.id))}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
