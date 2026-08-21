"use client";

import { useState, useEffect } from "react";
import IDE from "./IDE";

interface FileItem {
  name: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  children?: FileItem[];
}

interface CodeEditorViewProps {
  files: FileItem[];
  onClose: () => void;
}

export default function CodeEditorView({ files, onClose }: CodeEditorViewProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [openTabs, setOpenTabs] = useState<FileItem[]>([]);
  const [fileTree, setFileTree] = useState<FileItem[]>([]);

  useEffect(() => {
    // Build file tree from flat file list
    const tree = buildFileTree(files);
    setFileTree(tree);

    // Auto-select first file
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setOpenTabs([files[0]]);
    }
  }, [files]);

  const buildFileTree = (flatFiles: FileItem[]): FileItem[] => {
    const tree: FileItem[] = [];

    flatFiles.forEach(file => {
      const parts = file.path.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // It's a file
          current.push(file);
        } else {
          // It's a folder
          let folder = current.find(item => item.name === part && item.type === 'folder');
          if (!folder) {
            folder = {
              name: part,
              path: parts.slice(0, index + 1).join('/'),
              content: '',
              type: 'folder',
              children: []
            };
            current.push(folder);
          }
          current = folder.children!;
        }
      });
    });

    return tree;
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      if (!openTabs.find(tab => tab.path === file.path)) {
        setOpenTabs([...openTabs, file]);
      }
    }
  };

  const handleCloseTab = (file: FileItem) => {
    const newTabs = openTabs.filter(tab => tab.path !== file.path);
    setOpenTabs(newTabs);
    if (selectedFile?.path === file.path) {
      setSelectedFile(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconColorMap: Record<string, { color: string; text: string }> = {
      'js': { color: '#F7DF1E', text: 'JS' },
      'jsx': { color: '#61DAFB', text: 'JSX' },
      'ts': { color: '#3178C6', text: 'TS' },
      'tsx': { color: '#3178C6', text: 'TSX' },
      'py': { color: '#3776AB', text: 'PY' },
      'java': { color: '#007396', text: 'JAVA' },
      'dart': { color: '#00D2B8', text: 'DART' },
      'cpp': { color: '#00599C', text: 'C++' },
      'c': { color: '#A8B9CC', text: 'C' },
      'html': { color: '#E34F26', text: 'HTML' },
      'css': { color: '#1572B6', text: 'CSS' },
      'json': { color: '#000000', text: 'JSON' },
      'md': { color: '#083FA1', text: 'MD' },
      'txt': { color: '#6B7280', text: 'TXT' },
    };
    const icon = iconColorMap[ext || ''] || { color: '#6B7280', text: 'FILE' };
    return (
      <div
        className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded"
        style={{ backgroundColor: icon.color, color: 'white' }}
      >
        {icon.text}
      </div>
    );
  };

  const FileTreeItem = ({ item, depth = 0 }: { item: FileItem; depth?: number }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (item.type === 'folder') {
      return (
        <div>
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 cursor-pointer group"
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
          >
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              {isOpen ? (
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              ) : (
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a2 2 0 00-2 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              )}
            </svg>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white">{item.name}</span>
          </div>
          {isOpen && item.children?.map((child, idx) => (
            <FileTreeItem key={idx} item={child} depth={depth + 1} />
          ))}
        </div>
      );
    }

    return (
      <div
        onClick={() => handleFileClick(item)}
        className={`flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 cursor-pointer group ${selectedFile?.path === item.path ? 'bg-slate-700' : ''
          }`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {getFileIcon(item.name)}
        <span className={`text-sm ${selectedFile?.path === item.path ? 'font-semibold text-white' : 'text-slate-300 group-hover:text-white'}`}>
          {item.name}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-800 border-slate-700">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">Code Editor</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-all bg-purple-600 rounded-lg shadow-lg hover:bg-purple-700"
        >
          ← Back to Assignment
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File Explorer */}
        <div className="flex flex-col border-r w-72 bg-slate-800 border-slate-700">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white uppercase">
              <span>📁</span> Files Explorer
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {fileTree.map((item, idx) => (
              <FileTreeItem key={idx} item={item} />
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex flex-col flex-1 bg-slate-900">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto border-b bg-slate-800 border-slate-700">
              {openTabs.map((tab, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedFile(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer group transition-all ${selectedFile?.path === tab.path
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                  {getFileIcon(tab.name)}
                  <span className="text-sm font-medium">{tab.name.split('/').pop()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab);
                    }}
                    className="ml-2 hover:bg-white/20 rounded p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1">
            {selectedFile ? (
              <IDE
                file={{
                  type: 'file',
                  name: selectedFile.name,
                  path: selectedFile.path,
                  content: selectedFile.content
                }}
                readOnly={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="mb-4 text-6xl">📂</div>
                  <p className="text-lg">Select a file to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
