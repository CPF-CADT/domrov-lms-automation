/**
 * useHeroDemo - Manages interactive hero demo state.
 * Handles evaluation animation and reset states.
 */

import { useState, useCallback } from "react";

type DemoStatus = "idle" | "scanning" | "result";

interface UseHeroDemoReturn {
  status: DemoStatus;
  handleEvaluate: () => void;
  handleReset: () => void;
  isIdle: boolean;
  isScanning: boolean;
  isResult: boolean;
}

const SCAN_DURATION = 2000;

export function useHeroDemo(): UseHeroDemoReturn {
  const [status, setStatus] = useState<DemoStatus>("idle");

  const handleEvaluate = useCallback(() => {
    setStatus("scanning");
    setTimeout(() => setStatus("result"), SCAN_DURATION);
  }, []);

  const handleReset = useCallback(() => {
    setStatus("idle");
  }, []);

  return {
    status,
    handleEvaluate,
    handleReset,
    isIdle: status === "idle",
    isScanning: status === "scanning",
    isResult: status === "result",
  };
}
