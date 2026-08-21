import { useState, useRef, Suspense } from 'react';

interface FeedbackData {
  startLine: number;
  endLine?: number;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success' | 'suggestion';
}

interface FileData {
  type: string;
  name: string;
  path: string;
  content: string[] | string;
}

interface IDEProps {
  file?: FileData;
  initialFeedback?: Record<string, FeedbackData>;
  onContentChange?: (content: string) => void;
  onFeedbackChange?: (feedback: Record<string, FeedbackData>) => void;
  readOnly?: boolean;
}

export default function IDE({
  file = { type: 'file', name: 'untitled.txt', path: 'untitled.txt', content: '' },
  // initialFeedback = {},
  onContentChange: _onContentChange,
  onFeedbackChange: _onFeedbackChange
}: IDEProps) {
  // Convert content array to string if needed
  const getInitialContent = () => {
    if (Array.isArray(file.content)) {
      return file.content.join('\n');
    }
    return file.content || '';
  };

  const [content, _setContent] = useState(getInitialContent);
  // const [feedback] = useState<Record<string, FeedbackData>>(initialFeedback);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get language from file extension
  // const getLanguage = (filename: string) => {
  //   const ext = filename.split('.').pop()?.toLowerCase() || '';
  //   const languageMap: Record<string, string> = {
  //     'bat': 'bat',
  //     'cmd': 'bat',
  //     'js': 'javascript',
  //     'jsx': 'javascript',
  //     'ts': 'typescript',
  //     'tsx': 'typescript',
  //     'py': 'python',
  //     'java': 'java',
  //     'c': 'c',
  //     'cpp': 'cpp',
  //     'h': 'c',
  //     'hpp': 'cpp',
  //     'cs': 'csharp',
  //     'html': 'html',
  //     'css': 'css',
  //     'json': 'json',
  //     'xml': 'xml',
  //     'md': 'markdown',
  //     'sql': 'sql',
  //     'sh': 'shell',
  //     'bash': 'shell',
  //     'ps1': 'powershell',
  //     'yaml': 'yaml',
  //     'yml': 'yaml'
  //   };
    return (
      <div className="flex flex-col h-full w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">📄</span>
            <span className="text-gray-200 text-sm font-medium">{file.name}</span>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 relative overflow-hidden" ref={containerRef}>
          <Suspense fallback={<div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">Loading editor...</div>}>
            <div className="h-full bg-gray-900 text-gray-200 p-4">
              <pre>{content}</pre>
            </div>
          </Suspense>
        </div>
      </div>
    );
  }