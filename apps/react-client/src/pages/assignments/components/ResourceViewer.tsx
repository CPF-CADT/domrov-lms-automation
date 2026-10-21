import { useState } from "react";
import { X, ExternalLink, Copy, Check } from "lucide-react";

interface Resource {
    id: number;
    title: string;
    type: string;
    url?: string;
}

interface ResourceViewerProps {
    isOpen: boolean;
    onClose: () => void;
    resource: Resource | null;
}

export default function ResourceViewer({ isOpen, onClose, resource }: ResourceViewerProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !resource) {
        return null;
    }

    const handleCopyUrl = () => {
        if (resource.url) {
            navigator.clipboard.writeText(resource.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isGithubUrl = resource.url?.includes("github.com");
    const isUrl = resource.type === "URL";

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between bg-slate-900 text-white px-6 py-4 border-b border-slate-700">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <h2 className="text-lg font-bold truncate">{resource.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 hover:bg-slate-800 p-2 rounded transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {isUrl ? (
                        <div className="flex-1 flex flex-col">
                            {/* URL Info Bar */}
                            <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase">URL:</span>
                                <code className="text-sm text-slate-700 font-mono truncate flex-1">
                                    {resource.url}
                                </code>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyUrl}
                                        className="shrink-0 flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 transition text-xs font-medium"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 text-green-600" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                    {resource.url && (
                                        <a
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-medium"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Github Preview or Generic Message */}
                            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 p-6">
                                {isGithubUrl ? (
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-slate-900 mb-2">GitHub Repository</h3>
                                        <p className="text-sm text-slate-600 mb-4">
                                            This resource points to a GitHub repository. Click "Open" to view the code.
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {resource.url}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-5xl mb-4">📦</div>
                                        <h3 className="font-bold text-slate-900 mb-2">Resource Link</h3>
                                        <p className="text-sm text-slate-600">
                                            Click "Open" to view this resource in a new tab.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Non-URL Resources */
                        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 p-6">
                            <div className="text-center">
                                <div className="text-6xl mb-4">
                                    {resource.type === "FILE"
                                        ? ""
                                        : resource.type === "GITHUB"
                                            ? ""
                                            : ""}
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">{resource.title}</h3>
                                <p className="text-sm text-slate-600">
                                    Resource type: <span className="font-semibold">{resource.type}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
