import { useCallback, useRef, useEffect, useState } from "react";
import submissionService from "@/services/submissionService";
import type { MySubmissionResponseDto } from "@/types/submission";

interface DraftSyncState {
    resources: { resourceId?: number }[];
    githubUrl?: string;
    comments?: string;
}

/**
 * Hook for backend-driven draft submission sync
 * - Every change triggers an API call
 * - Text inputs are debounced (500ms)
 * - Structural changes (add/remove) are immediate
 * - On error, reverts to last known valid state
 */
export function useDraftSubmissionSync(
    assessmentId: number | string,
    onStateChange?: (state: MySubmissionResponseDto) => void,
    onError?: (error: Error) => void
) {
    const initialState: DraftSyncState = {
        resources: [],
        githubUrl: undefined,
        comments: "",
    };

    const [state, setState] = useState<DraftSyncState>(initialState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Last known valid state from backend (for rollback)
    const lastValidState = useRef<DraftSyncState>(initialState);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Saves draft to backend and updates local state from response
     */
    const saveDraft = useCallback(
        async (draftData: DraftSyncState) => {
            try {
                setIsLoading(true);
                setError(null);

                // Save draft to backend
                await submissionService.saveDraftAssignment(
                    Number(assessmentId),
                    draftData
                );

                // Fetch full submission to get updated resources from backend
                const fullSubmission = await submissionService.getMySubmissionStatus(Number(assessmentId));

                // Update lastValidState with full submission data
                const newValidState: DraftSyncState = {
                    resources: fullSubmission.resources?.map((r) => ({ resourceId: r.id })) || [],
                    githubUrl: undefined,
                    comments: fullSubmission.comments || "",
                };
                lastValidState.current = newValidState;
                setState(newValidState);
                onStateChange?.(fullSubmission);
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                onError?.(error);

                // Rollback to last known valid state
                setState(lastValidState.current);
            } finally {
                setIsLoading(false);
            }
        },
        [assessmentId, onStateChange, onError]
    );

    /**
     * Update resources (immediate, no debounce)
     */
    const updateResources = useCallback(
        (resources: { resourceId?: number }[]) => {
            const newState = { ...state, resources };
            setState(newState);
            saveDraft(newState);
        },
        [state, saveDraft]
    );

    /**
     * Update comments (debounced)
     */
    const updateComments = useCallback(
        (comments: string) => {
            const newState = { ...state, comments };
            setState(newState);

            // Clear existing debounce timer
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Debounce the API call (500ms)
            debounceTimer.current = setTimeout(() => {
                saveDraft(newState);
            }, 500);
        },
        [state, saveDraft]
    );

    /**
     * Update GitHub URL (debounced)
     */
    const updateGithubUrl = useCallback(
        (githubUrl: string) => {
            const newState = { ...state, githubUrl };
            setState(newState);

            // Clear existing debounce timer
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Debounce the API call (500ms)
            debounceTimer.current = setTimeout(() => {
                saveDraft(newState);
            }, 500);
        },
        [state, saveDraft]
    );

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    return {
        state,
        isLoading,
        error,
        updateResources,
        updateComments,
        updateGithubUrl,
    };
}
