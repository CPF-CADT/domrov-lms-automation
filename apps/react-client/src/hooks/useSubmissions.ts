import { useState, useEffect, useCallback } from "react";

import type { UploadedFile } from "../features/assignment/UploadSection";
import { extractZipFile, fetchSubmissions } from "../lib/api/submissions";

export function useSubmissions(assignmentId: string, userId: string) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await fetchSubmissions(assignmentId, userId);
                if (!mounted || data.length === 0) return;

                const latestSubmission = data[data.length - 1];
                const files: UploadedFile[] = [
                    ...(latestSubmission.files || []).map((f) => ({
                        name: f.name,
                        size: formatFileSize(f.size),
                        uploadedAt: new Date(f.uploadedAt).toLocaleString(),
                        path: f.path,
                        type: "file" as const,
                    })),
                    ...(latestSubmission.links || []).map((l) => ({
                        name: l.url,
                        size: "Link",
                        uploadedAt: new Date(l.addedAt).toLocaleString(),
                        type: "link" as const,
                        url: l.url,
                    })),
                ];
                setUploadedFiles(files);
            } catch (e) {
                console.error("Failed to fetch submissions:", e);
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [assignmentId, userId]);

    const addFiles = useCallback((newFiles: UploadedFile[]) => {
        setUploadedFiles((prev) => [...prev, ...newFiles]);
    }, []);

    const removeFile = useCallback((index: number) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    return { uploadedFiles, isLoading, addFiles, removeFile };
}

export function useZipExtractor() {
    const [editorFiles, setEditorFiles] = useState<
        { name: string; path: string; content: string; type: "file" | "folder" }[]
    >([]);
    const [showCodeEditor, setShowCodeEditor] = useState(false);

    const extractAndOpen = useCallback(async () => {
        const files = await extractZipFile();
        setEditorFiles(files.map((f) => ({ ...f, type: "file" as const })));
        setShowCodeEditor(true);
    }, []);

    const openFileInEditor = useCallback(
        async (filePath: string, fileName: string) => {
            const response = await fetch(filePath);
            const content = await response.text();
            setEditorFiles([{ name: fileName, path: fileName, content, type: "file" as const }]);
            setShowCodeEditor(true);
        },
        [],
    );

    const closeEditor = useCallback(() => {
        setShowCodeEditor(false);
    }, []);

    return { editorFiles, showCodeEditor, extractAndOpen, openFileInEditor, closeEditor };
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
