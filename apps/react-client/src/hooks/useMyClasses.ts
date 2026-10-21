import { useCallback, useEffect, useState } from "react";
import classService from "@/services/ClassService";
import type { GetMyClassesResponseDto } from "@/types/Class";

export function useMyClasses() {
  const [classes, setClasses] = useState<GetMyClassesResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setClasses(await classService.getMyClasses());
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Failed to load classes"));
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { classes, isLoading, error, refresh };
}
