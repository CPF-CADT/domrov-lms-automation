import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Square, Terminal } from 'lucide-react';
import { cancelCodeExecution, getCodeExecution, startCodeExecution, type ExecutionProjectFile, type ExecutionResult } from '@/services/CodeExecutionService';

interface ExecutionTerminalProps { submissionId: string | number; files: ExecutionProjectFile[]; }
interface TerminalEntry { command: string; result?: ExecutionResult; error?: string; }

const terminalStates = new Set(['QUEUED', 'RUNNING']);
const prompt = 'teacher@domrov:/workspace$';
const languageStorageKey = 'domrov.execution.language';
const languageCommands: Record<string, string> = {
  python: 'python main.py', node: 'node main.js', c: 'gcc main.c -o main && ./main',
  cpp: 'g++ main.cpp -o main && ./main', java: 'javac Main.java && java Main',
};

function resultText(result: ExecutionResult) {
  const output = `${result.stdout ?? ''}${result.stderr ? `${result.stdout ? '\n' : ''}${result.stderr}` : ''}`.trimEnd();
  const lines = [`[${result.status}]`];
  if (output) lines.push(output);
  if (result.exitCode !== undefined) lines.push(`Process exited with code ${result.exitCode}`);
  return lines.join('\n');
}

export default function ExecutionTerminal({ submissionId, files }: ExecutionTerminalProps) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'python';
    return window.localStorage.getItem(languageStorageKey) ?? 'python';
  });
  const [command, setCommand] = useState('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const timer = useRef<number | null>(null);
  const commandInput = useRef<HTMLInputElement | null>(null);
  const outputPanel = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => { window.localStorage.setItem(languageStorageKey, language); }, [language]);
  useEffect(() => { if (!running) commandInput.current?.focus(); }, [running, entries.length]);
  useEffect(() => {
    const panel = outputPanel.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [entries]);

  const updateEntry = (index: number, update: Partial<TerminalEntry>) => {
    setEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...update } : entry));
  };

  const poll = (id: string, entryIndex: number) => {
    timer.current = window.setTimeout(async () => {
      try {
        const result = await getCodeExecution(id);
        updateEntry(entryIndex, { result });
        if (terminalStates.has(result.status)) poll(id, entryIndex);
        else { setRunning(false); setActiveExecutionId(null); }
      } catch (pollError) {
        updateEntry(entryIndex, { error: pollError instanceof Error ? pollError.message : 'Could not read execution result.' });
        setRunning(false); setActiveExecutionId(null);
      }
    }, 1000);
  };

  const run = async () => {
    const nextCommand = command.trim();
    if (!nextCommand || running) return;
    // `clear` is a terminal display command. Handle it locally so it does not
    // start a new sandbox process or fail because TERM is unavailable.
    if (nextCommand === 'clear') {
      setEntries([]);
      setCommand('');
      setHistoryIndex(-1);
      return;
    }
    if (!files.length) return;
    const entryIndex = entries.length;
    setEntries((current) => [...current, { command: nextCommand, result: { executionId: '', status: 'QUEUED' } }]);
    setCommand(''); setHistoryIndex(-1); setRunning(true);
    try {
      const queued = await startCodeExecution({ submissionId, language, command: nextCommand, files });
      setActiveExecutionId(queued.executionId);
      updateEntry(entryIndex, { result: { executionId: queued.executionId, status: queued.status } });
      poll(queued.executionId, entryIndex);
    } catch (runError) {
      updateEntry(entryIndex, { error: runError instanceof Error ? runError.message : 'Could not start execution.' });
      setRunning(false);
    }
  };

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      setEntries([]);
      setCommand('');
      setHistoryIndex(-1);
      return;
    }
    if (event.key === 'Enter') { event.preventDefault(); void run(); return; }
    const commands = entries.map((entry) => entry.command);
    if (event.key === 'ArrowUp' && commands.length) {
      event.preventDefault(); const nextIndex = historyIndex < 0 ? commands.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex); setCommand(commands[nextIndex]);
    }
    if (event.key === 'ArrowDown' && historyIndex >= 0) {
      event.preventDefault(); const nextIndex = historyIndex + 1;
      if (nextIndex >= entries.length) { setHistoryIndex(-1); setCommand(''); }
      else { setHistoryIndex(nextIndex); setCommand(entries[nextIndex].command); }
    }
  };

  const handleLanguageChange = (nextLanguage: string) => { setLanguage(nextLanguage); setCommand(''); setHistoryIndex(-1); };
  const stop = async () => {
    if (!activeExecutionId) return;
    await cancelCodeExecution(activeExecutionId).catch(() => undefined);
    setEntries((current) => current.map((entry) => entry.result?.executionId === activeExecutionId ? { ...entry, result: { ...entry.result, status: 'CANCELLED' } } : entry));
    setRunning(false); setActiveExecutionId(null);
  };

  return <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-xl">
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-2"><Terminal className="h-4 w-4 text-emerald-400" /><h3 className="font-semibold">Teacher terminal</h3></div>
      <label className="relative flex items-center"><span className="sr-only">Execution language</span>
        <select value={language} onChange={(event) => handleLanguageChange(event.target.value)} aria-label="Execution language" className="appearance-none rounded border border-slate-700 bg-slate-950 py-1.5 pl-2 pr-7 text-xs text-slate-200">
          <option value="python">Python</option><option value="node">Node.js</option><option value="c">C</option><option value="cpp">C++</option><option value="java">Java</option>
        </select><ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
      </label>
    </div>
    <div className="bg-black p-4 font-mono text-xs leading-6" onClick={() => commandInput.current?.focus()}>
      <div ref={outputPanel} className="min-h-32 max-h-72 overflow-auto whitespace-pre-wrap text-slate-300" aria-live="polite">
        {!entries.length ? <div className="text-slate-500">DOMROV remote terminal{`\n`}Read-only submission workspace{`\n`}{`\n`}Type a command and press Enter. Example:{`\n`}{languageCommands[language]}</div> : null}
        {entries.map((entry, index) => <div key={`${entry.command}-${index}`} className="mb-4 last:mb-0">
          <div><span className="text-emerald-400">{prompt}</span> <span className="text-slate-100">{entry.command}</span></div>
          {entry.result ? <div className="mt-1 text-slate-300">{resultText(entry.result)}</div> : null}
          {entry.error ? <div className="mt-1 text-red-300">[FAILED]{`\n`}{entry.error}</div> : null}
        </div>)}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3">
        <span className="select-none whitespace-nowrap text-emerald-400">{prompt}</span>
        <input ref={commandInput} value={command} onChange={(event) => { setCommand(event.target.value); setHistoryIndex(-1); }} onKeyDown={handleCommandKeyDown} disabled={running || !files.length} aria-label="Terminal command" placeholder={files.length ? 'type a command and press Enter' : 'No project files available'} className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed" autoComplete="off" autoFocus />
        {running ? <button type="button" onClick={stop} className="inline-flex items-center gap-1 rounded border border-red-500/60 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"><Square className="h-3 w-3" />Stop</button> : null}
      </div>
    </div>
  </section>;
}
