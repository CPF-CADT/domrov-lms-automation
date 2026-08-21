"use client";

import { Icon } from "@/components/data-display";
import { useHeroDemo } from "@/hooks";

// --- Types ---
interface CodeLineProps {
  lineNum: number;
  children: React.ReactNode;
}

interface ProgressBarProps {
  label: string;
  status: string;
  statusColor: string;
  barColor: string;
  width: string;
  hint?: string;
}

// --- Sub-components ---

/** EditorHeader - Mac-style window chrome with traffic lights */
function EditorHeader() {
  return (
    <div className="bg-[#0f243b] px-4 py-3 flex items-center justify-between border-b border-slate-800/60">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
        <div className="w-3 h-3 rounded-full bg-green-400/80" />
      </div>
      <div className="text-xs text-slate-500">assignment_01.py</div>
      <div className="w-4" />
    </div>
  );
}

/** CodeLine - Single line of syntax-highlighted code */
function CodeLine({ lineNum, children }: CodeLineProps) {
  const lineColor = lineNum === 1 ? "text-purple-400" : "text-slate-600";
  return (
    <div className="flex">
      <span className={`${lineColor} w-8 text-right mr-4 opacity-40`}>
        {lineNum}
      </span>
      {children}
    </div>
  );
}

/** ScanLine - Animated scanning effect */
function ScanLine() {
  return (
    <div
      className="absolute left-0 right-0 h-1 bg-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,0.8)] z-20 animate-scan"
      style={{ top: "0%" }}
    />
  );
}

/** ProgressBar - Result progress indicator */
function ProgressBar({
  label,
  status,
  statusColor,
  barColor,
  width,
  hint,
}: ProgressBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={`font-bold ${statusColor}`}>{status}</span>
      </div>
      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
        <div className={`${barColor} h-full`} style={{ width }} />
      </div>
      {hint && <p className="text-xs text-slate-500 italic mt-1">{hint}</p>}
    </div>
  );
}

/** ResultPopup - Displays evaluation results */
function ResultPopup({ onReset }: { onReset: () => void }) {
  return (
    <div className="absolute inset-0 bg-[#091829]/90 backdrop-blur-sm z-40 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border-t-4 border-primary">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">
              Total Score
            </div>
            <div className="text-4xl font-black text-primary">
              92<span className="text-lg text-slate-400 font-medium">/100</span>
            </div>
          </div>
          <div className="bg-green-100 text-green-700 p-2 rounded-full shadow-sm">
            <Icon name="check_circle" />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <ProgressBar
            label="Logic & Correctness"
            status="Perfect"
            statusColor="text-green-600"
            barColor="bg-green-500"
            width="100%"
          />
          <ProgressBar
            label="Efficiency"
            status="Optimize"
            statusColor="text-yellow-600"
            barColor="bg-yellow-500"
            width="70%"
            hint='"Use memoization to improve speed for large inputs."'
          />
        </div>

        <button
          onClick={onReset}
          className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-dark transition-all text-sm shadow-md"
        >
          Try Another
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---

/**
 * InteractiveHeroDemo - Animated code evaluation demo for landing page.
 * Shows a mock code editor with AI grading animation.
 */
export default function InteractiveHeroDemo() {
  const { isIdle, isScanning, isResult, handleEvaluate, handleReset } =
    useHeroDemo();

  return (
    <div className="aspect-video rounded-2xl bg-primary p-3 shadow-2xl relative overflow-hidden group border-4 border-primary-dark">
      {/* Code Window */}
      <div className="code-block w-full h-full flex flex-col relative z-10 shadow-inner overflow-hidden">
        <EditorHeader />

        {/* Code Content */}
        <div className="p-6 text-slate-300 relative flex-1">
          {isScanning && <ScanLine />}

          <div className="space-y-1 opacity-90">
            <CodeLine lineNum={1}>
              <span className="text-purple-400">def</span>{" "}
              <span className="text-blue-300">calculate_fibonacci</span>(n):
            </CodeLine>
            <CodeLine lineNum={2}>
              <span className="pl-4 text-slate-400">
                # Check for base cases
              </span>
            </CodeLine>
            <CodeLine lineNum={3}>
              <span className="pl-4 text-purple-400">if</span> n {"<="}{" "}
              <span className="text-orange-300">1</span>:
            </CodeLine>
            <CodeLine lineNum={4}>
              <span className="pl-8 text-purple-400">return</span> n
            </CodeLine>
            <CodeLine lineNum={5}>
              <span className="pl-4 text-purple-400">else</span>:
            </CodeLine>
            <CodeLine lineNum={6}>
              <span className="pl-8 text-purple-400">return</span>{" "}
              calculate_fibonacci(n-
              <span className="text-orange-300">1</span>) +
              calculate_fibonacci(n-
              <span className="text-orange-300">2</span>)
            </CodeLine>
          </div>

          {/* Run Button */}
          {isIdle && (
            <div className="absolute bottom-6 right-6 z-30">
              <button
                onClick={handleEvaluate}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-lg shadow-lg shadow-green-900/40 transition-all hover:scale-105 active:scale-95"
              >
                <Icon name="play_arrow" size="lg" />
                Run AI Evaluation
              </button>
            </div>
          )}
        </div>

        {/* Result Popup */}
        {isResult && <ResultPopup onReset={handleReset} />}
      </div>

      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 blur-[80px] opacity-20 pointer-events-none" />
    </div>
  );
}
