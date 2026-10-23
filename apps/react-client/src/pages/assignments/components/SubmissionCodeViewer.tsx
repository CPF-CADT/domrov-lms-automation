import Editor from "@monaco-editor/react";
import { ChevronDown, ChevronRight, FileCode2, FileText, Folder, FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import evaluationService from "@/services/EvaluationService";
import submissionService from "@/services/SubmissionService";
import type { FileContentDto, FolderNodeDto } from "@/types/Evaluation";
import type { EvaluationFeedbackItemDto, FeedbackItemDto } from "@/types/Submission";
import { FeedbackType } from "@/types/Enums";

export interface SubmissionCodeViewerProps {
  submissionId: number;
  feedbacks?: EvaluationFeedbackItemDto[];
  canComment?: boolean;
  showFeedback?: boolean;
  onFeedbackChanged?: () => void | Promise<void>;
}

interface TreeItemProps { node: FolderNodeDto; relativePath: string; selectedPath: string | null; onSelect: (path: string) => void; isRoot?: boolean; }
interface LineRange { start: number; end: number; }

const CODE_EXTENSIONS = new Set(["c", "cc", "cpp", "cs", "css", "go", "h", "hpp", "html", "java", "js", "jsx", "json", "kt", "md", "php", "py", "rb", "rs", "sh", "sql", "swift", "ts", "tsx", "txt", "xml", "yml", "yaml"]);

export function normalizeFeedbackPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function extensionFor(name: string): string { return name.toLowerCase().split(".").pop() || ""; }
function isCodeFocused(node: FolderNodeDto): boolean { return node.type === "file" && CODE_EXTENSIONS.has(extensionFor(node.name)); }
function sortedChildren(node: FolderNodeDto): FolderNodeDto[] {
  return [...(node.children || [])].sort((a, b) => {
    const codeRank = Number(isCodeFocused(b)) - Number(isCodeFocused(a));
    if (codeRank) return codeRank;
    const folderRank = Number(a.type === "folder") - Number(b.type === "folder");
    return folderRank || a.name.localeCompare(b.name);
  });
}

function findFirstFile(node: FolderNodeDto, prefix = "", isRoot = true): string | null {
  const path = isRoot && node.type === "file" ? node.name : isRoot ? prefix : (prefix ? `${prefix}/${node.name}` : node.name);
  if (node.type === "file") return path;
  for (const child of sortedChildren(node)) {
    const match = findFirstFile(child, path, false);
    if (match) return match;
  }
  return null;
}

export function languageFromFilename(filename: string): string {
  const languages: Record<string, string> = { c: "c", cc: "cpp", cpp: "cpp", h: "cpp", hpp: "cpp", cs: "csharp", css: "css", go: "go", html: "html", java: "java", js: "javascript", jsx: "javascript", json: "json", kt: "kotlin", md: "markdown", php: "php", py: "python", rb: "ruby", rs: "rust", sh: "shell", sql: "sql", swift: "swift", ts: "typescript", tsx: "typescript", xml: "xml", yml: "yaml", yaml: "yaml" };
  return languages[extensionFor(filename)] || "plaintext";
}

function SubmissionFileTree({ node, relativePath, selectedPath, onSelect, isRoot = false }: TreeItemProps) {
  const [expanded, setExpanded] = useState(relativePath === "");
  const nodePath = isRoot && node.type === "file" ? node.name : isRoot ? relativePath : (relativePath ? `${relativePath}/${node.name}` : node.name);
  const isSelected = node.type === "file" && selectedPath === nodePath;
  if (node.type === "file") return <button type="button" onClick={() => onSelect(nodePath)} title={nodePath} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${isSelected ? "bg-blue-100 text-blue-800" : "text-slate-700 hover:bg-slate-100"}`}>{isCodeFocused(node) ? <FileCode2 className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}<span className="truncate">{node.name}</span></button>;
  return <div><button type="button" onClick={() => setExpanded((value) => !value)} title={nodePath} className="flex w-full items-center gap-1 rounded px-1 py-1.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-100">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{expanded ? <FolderOpen className="h-4 w-4 text-amber-600" /> : <Folder className="h-4 w-4 text-amber-600" />}<span className="truncate">{node.name}</span></button>{expanded && node.children?.length ? <div className="ml-4 border-l border-slate-200 pl-2">{sortedChildren(node).map((child) => <SubmissionFileTree key={`${nodePath}/${child.name}`} node={child} relativePath={nodePath} selectedPath={selectedPath} onSelect={onSelect} />)}</div> : null}</div>;
}

interface FeedbackPanelProps { feedbacks: EvaluationFeedbackItemDto[]; canComment: boolean; selection: LineRange | null; message: string; type: FeedbackType; editingId: string | null; saving: boolean; error: string | null; onMessageChange: (value: string) => void; onTypeChange: (value: FeedbackType) => void; onSave: () => void; onEdit: (feedback: EvaluationFeedbackItemDto) => void; onCancel: () => void; }

function FeedbackPanel({ feedbacks, canComment, selection, message, type, editingId, saving, error, onMessageChange, onTypeChange, onSave, onEdit, onCancel }: FeedbackPanelProps) {
  return <aside className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
    <h3 className="text-sm font-semibold text-slate-900">File feedback</h3><p className="mt-1 text-xs text-slate-500">{feedbacks.length} comment{feedbacks.length === 1 ? "" : "s"} on this file.</p>
    <div className="mt-3 space-y-2">{feedbacks.map((feedback) => <div key={feedback.id} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700"><div className="flex items-start justify-between gap-2"><p className={`font-semibold ${feedback.feedbackType === FeedbackType.ERROR ? "text-red-700" : feedback.feedbackType === FeedbackType.WARNING ? "text-amber-700" : "text-blue-700"}`}>{feedback.feedbackType}</p>{canComment && !feedback.id.startsWith("local-") ? <button type="button" onClick={() => onEdit(feedback)} className="text-blue-600 hover:underline">Edit</button> : null}</div><p className="text-slate-500">Line {feedback.startLine || 1}{feedback.endLine && feedback.endLine !== feedback.startLine ? `-${feedback.endLine}` : ""}</p><p className="mt-1 whitespace-pre-wrap">{feedback.message}</p></div>)}</div>
    {canComment ? <div className="mt-4 border-t border-slate-200 pt-4"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{editingId ? "Update feedback" : "Add feedback"}</h4><p className="mt-1 text-xs text-slate-500">{selection ? `Lines ${selection.start}-${selection.end}` : "Select a line or range in the editor."}</p><select value={type} onChange={(event) => onTypeChange(event.target.value as FeedbackType)} className="mt-3 w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm"><option value={FeedbackType.SUGGESTION}>Suggestion</option><option value={FeedbackType.WARNING}>Warning</option><option value={FeedbackType.ERROR}>Error</option></select><textarea value={message} onChange={(event) => onMessageChange(event.target.value)} rows={4} placeholder="Write feedback for the selected lines..." className="mt-2 w-full resize-none rounded border border-slate-300 px-2 py-2 text-sm" />{error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}<div className="mt-2 flex gap-2">{editingId ? <button type="button" onClick={onCancel} className="flex-1 rounded border border-slate-300 px-3 py-2 text-xs text-slate-700">Cancel</button> : null}<button type="button" disabled={!selection || !message.trim() || saving} onClick={onSave} className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : editingId ? "Update" : "Save"}</button></div></div> : <p className="mt-4 text-xs text-slate-500">Feedback is read-only in this view.</p>}
  </aside>;
}

export default function SubmissionCodeViewer({ submissionId, feedbacks = [], canComment = false, showFeedback = true, onFeedbackChanged }: SubmissionCodeViewerProps) {
  const [tree, setTree] = useState<FolderNodeDto | null>(null); const [selectedPath, setSelectedPath] = useState<string | null>(null); const [file, setFile] = useState<FileContentDto | null>(null); const [feedbackItems, setFeedbackItems] = useState<EvaluationFeedbackItemDto[]>(feedbacks); const [selection, setSelection] = useState<LineRange | null>(null); const [message, setMessage] = useState(""); const [type, setType] = useState<FeedbackType>(FeedbackType.SUGGESTION); const [editingId, setEditingId] = useState<string | null>(null); const [treeLoading, setTreeLoading] = useState(true); const [fileLoading, setFileLoading] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [feedbackError, setFeedbackError] = useState<string | null>(null); const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<any>(null); const monacoRef = useRef<any>(null); const decorationIds = useRef<string[]>([]);

  useEffect(() => setFeedbackItems(feedbacks), [feedbacks]);
  useEffect(() => { let cancelled = false; setTreeLoading(true); setTree(null); setFile(null); setSelectedPath(null); setError(null); evaluationService.getSubmissionFolderStructure(submissionId).then(({ data }) => { if (cancelled) return; const nextTree = data.folder_structure; setTree(nextTree); setSelectedPath(nextTree ? findFirstFile(nextTree) : null); }).catch(() => { if (!cancelled) setError("Could not load the submission file tree."); }).finally(() => { if (!cancelled) setTreeLoading(false); }); return () => { cancelled = true; }; }, [submissionId]);
  useEffect(() => { setSelection(null); setEditingId(null); setMessage(""); setFeedbackError(null); }, [selectedPath]);
  useEffect(() => { if (!selectedPath) { setFile(null); return; } let cancelled = false; setFileLoading(true); setError(null); evaluationService.getSubmissionFileContent(submissionId, selectedPath).then(({ data }) => { if (!cancelled) setFile(data.file); }).catch(() => { if (!cancelled) { setFile(null); setError(`Could not load ${selectedPath}.`); } }).finally(() => { if (!cancelled) setFileLoading(false); }); return () => { cancelled = true; }; }, [submissionId, selectedPath]);

  useEffect(() => { const editor = editorRef.current; const monaco = monacoRef.current; if (!editor || !monaco) return; const selected = normalizeFeedbackPath(selectedPath || ""); const decorations = feedbackItems.filter((item) => normalizeFeedbackPath(item.filePath) === selected).map((item) => { const start = Math.max(1, item.startLine || 1); const end = Math.max(start, item.endLine || start); const kind = item.feedbackType; return { range: new monaco.Range(start, 1, end, 1), options: { isWholeLine: true, className: `submission-feedback-line-${kind}`, linesDecorationsClassName: `submission-feedback-gutter-${kind}`, glyphMarginClassName: `submission-feedback-glyph-${kind}`, hoverMessage: { value: `**${kind}**\n\n${item.message}` }, overviewRuler: { color: kind === FeedbackType.ERROR ? "#dc2626" : kind === FeedbackType.WARNING ? "#d97706" : "#2563eb", position: 4 } } }; }); decorationIds.current = editor.deltaDecorations(decorationIds.current, decorations); }, [feedbackItems, selectedPath, file, editorReady]);

  const content = useMemo(() => file?.content.join("\n") || "", [file]); const selectedFeedbacks = useMemo(() => feedbackItems.filter((item) => normalizeFeedbackPath(item.filePath) === normalizeFeedbackPath(selectedPath || "")), [feedbackItems, selectedPath]);
  const handleEditorMount = (editor: any, monaco: any) => { editorRef.current = editor; monacoRef.current = monaco; setEditorReady(true); editor.onDidChangeCursorSelection((event: any) => { const start = Math.min(event.selection.startLineNumber, event.selection.endLineNumber); const end = Math.max(event.selection.startLineNumber, event.selection.endLineNumber); setSelection({ start, end }); }); };
  const handleEdit = (feedback: EvaluationFeedbackItemDto) => { setEditingId(feedback.id); setMessage(feedback.message); setType(feedback.feedbackType); const start = feedback.startLine || 1; const end = Math.max(start, feedback.endLine || start); setSelection({ start, end }); editorRef.current?.setSelection({ startLineNumber: start, startColumn: 1, endLineNumber: end, endColumn: 1 }); };
  const handleSave = async () => { if (!selectedPath || !selection || !message.trim()) return; setSaving(true); setFeedbackError(null); const payload: FeedbackItemDto = { path: normalizeFeedbackPath(selectedPath), startLine: selection.start, endLine: selection.end, message: message.trim(), type }; try { if (editingId) { await submissionService.updateFeedback(submissionId, editingId, payload); setFeedbackItems((items) => items.map((item) => item.id === editingId ? { ...item, filePath: payload.path, startLine: payload.startLine ?? null, endLine: payload.endLine ?? null, message: payload.message, feedbackType: payload.type } : item)); } else { const localFeedback: EvaluationFeedbackItemDto = { id: `local-${Date.now()}`, filePath: payload.path, startLine: payload.startLine ?? null, endLine: payload.endLine ?? null, message: payload.message, feedbackType: payload.type, createdAt: new Date() }; await submissionService.addFeedback(submissionId, payload); setFeedbackItems((items) => [...items, localFeedback]); } setMessage(""); setEditingId(null); void onFeedbackChanged?.(); } catch (saveError: any) { setFeedbackError(saveError?.response?.data?.message || saveError?.message || "Could not save feedback."); } finally { setSaving(false); } };

  if (treeLoading) return <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading submission files...</div>;
  if (!tree && error) return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!tree || (!tree.children?.length && tree.type === "folder")) return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No files are available for this submission.</div>;
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><style>{`.submission-feedback-line-suggestion{background:rgba(37,99,235,.10)}.submission-feedback-line-warning{background:rgba(217,119,6,.12)}.submission-feedback-line-error{background:rgba(220,38,38,.12)}.submission-feedback-gutter-suggestion{border-left:3px solid #2563eb}.submission-feedback-gutter-warning{border-left:3px solid #d97706}.submission-feedback-gutter-error{border-left:3px solid #dc2626}.submission-feedback-glyph-suggestion{background:#2563eb}.submission-feedback-glyph-warning{background:#d97706}.submission-feedback-glyph-error{background:#dc2626}`}</style>{error ? <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}<div className={`grid min-h-[440px] ${showFeedback ? "lg:grid-cols-[200px_minmax(0,1fr)_250px]" : "lg:grid-cols-[200px_minmax(0,1fr)]"}`}><div className="border-b border-slate-200 p-2.5 lg:border-b-0 lg:border-r"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Submission files</h3><SubmissionFileTree node={tree} relativePath="" selectedPath={selectedPath} onSelect={setSelectedPath} isRoot /></div><section className="min-w-0"><div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><span className="truncate font-mono text-xs text-slate-600">{selectedPath || "Select a file"}</span><span className="ml-3 shrink-0 text-xs text-slate-400">Read-only</span></div>{fileLoading ? <div className="flex h-[400px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading file...</div> : selectedPath && file ? <Editor height="400px" language={languageFromFilename(file.name || selectedPath)} value={content} theme="vs-light" onMount={handleEditorMount} options={{ readOnly: true, glyphMargin: true, minimap: { enabled: false }, wordWrap: "on", scrollBeyondLastLine: false }} loading={<div className="p-4 text-sm text-slate-500">Loading editor...</div>} /> : <div className="flex h-[400px] items-center justify-center text-sm text-slate-500">Select a file to view its contents.</div>}</section>{showFeedback ? <FeedbackPanel feedbacks={selectedFeedbacks} canComment={canComment} selection={selection} message={message} type={type} editingId={editingId} saving={saving} error={feedbackError} onMessageChange={setMessage} onTypeChange={setType} onSave={handleSave} onEdit={handleEdit} onCancel={() => { setEditingId(null); setMessage(""); setFeedbackError(null); }} /> : null}</div></div>;
}

export { FeedbackPanel, SubmissionFileTree };
