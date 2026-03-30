import { FileText, ExternalLink, Eye, Code2 } from "lucide-react";
import type { UploadedFile } from "./UploadSection";

interface Resource {
    id: number;
    title: string;
    type: string;
    url?: string;
}

interface SubmissionResourcesProps {
    resources: Resource[];
    isViewOnly?: boolean;
    onViewDetails?: (resource: Resource) => void;
    onViewInIDE?: (file: UploadedFile) => Promise<void>;
}

export default function SubmissionResources({
    resources,
    isViewOnly = false,
    onViewDetails,
    onViewInIDE,
}: SubmissionResourcesProps) {
    const isFile = (type: string) => type === "FILE" || !type || type === "OTHER";
    const isUrl = (type: string) => type === "URL" || type === "GITHUB";

    if (!resources || resources.length === 0) {
        return (
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 text-sm font-medium">No resources submitted</p>
                <p className="text-slate-500 text-xs mt-1">No files or links have been uploaded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {resources.map((resource) => (
                <div
                    key={resource.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isViewOnly
                        ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        : "bg-blue-50 border-blue-200 hover:border-blue-300"
                        }`}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-lg">
                            {isUrl(resource.type) ? (
                                <ExternalLink className="w-5 h-5 text-blue-600" />
                            ) : (
                                <FileText className="w-5 h-5 text-blue-600" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate text-sm">
                                {resource.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {isFile(resource.type) ? "File Resource" : "URL Link"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        {/* View in IDE for file resources */}
                        {isFile(resource.type) && onViewInIDE && resource.url && (
                            <button
                                onClick={() =>
                                    onViewInIDE({
                                        resourceId: resource.id,
                                        name: resource.title,
                                        path: resource.url || "",
                                        size: "0 KB",
                                        uploadedAt: new Date().toISOString(),
                                        type: "file",
                                        url: resource.url,
                                    } as UploadedFile)
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition text-xs font-semibold whitespace-nowrap"
                                title="View in IDE"
                            >
                                <Code2 className="w-4 h-4" />
                                <span>IDE</span>
                            </button>
                        )}

                        {/* View Details for all resources when graded */}
                        {onViewDetails && isViewOnly && (
                            <button
                                onClick={() => onViewDetails(resource)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition text-xs font-semibold whitespace-nowrap"
                                title="View Details"
                            >
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                            </button>
                        )}

                        {/* Open external URL */}
                        {resource.url && (
                            <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition text-xs font-semibold whitespace-nowrap"
                                title="Open in new tab"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>Open</span>
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
