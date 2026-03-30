import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { assignmentRepository } from "@/services/AssignmentRepository";

export interface AssignmentData {
  id?: string;
  title: string;
  session: string;
  submissionType: "individual" | "group";
  instructions: string;
  startDate: string;
  startTime: string;
  dueDate: string;
  dueTime: string;
  maxScore: number;
  allowedSubmissionMethod: string;
  allowLateSubmissions: boolean;
  aiEvaluationEnabled: boolean;
  learningResources: File[];
  status?: "draft" | "published" | "archived";
  submissionRate?: number;
}

interface AssignmentContextType {
  // Assignments list
  assignments: AssignmentData[];

  // Create operations
  createAssignment: (data: AssignmentData) => string; // Returns new assignment ID
  createDraft: (classId: string, data: AssignmentData) => void;

  // Read operations
  getAssignmentById: (id: string) => AssignmentData | undefined;
  getAssignmentsByClass: (classId: string) => AssignmentData[];
  getDraftByClass: (classId: string) => AssignmentData | undefined;

  // Update operations
  updateAssignment: (id: string, data: Partial<AssignmentData>) => boolean;
  updateDraft: (classId: string, data: Partial<AssignmentData>) => void;

  // Delete operations
  deleteAssignment: (id: string) => boolean;
  deleteDraft: (classId: string) => void;

  // Publish operations
  publishAssignment: (id: string) => boolean;
  archiveAssignment: (id: string) => boolean;

  // Get draft data
  getDraftData: (classId: string) => AssignmentData | null;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(
  undefined
);

export function AssignmentProvider({ children }: { children: React.ReactNode }) {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);

  // Initialize repository and load assignments on mount
  useEffect(() => {
    const initializeRepository = async () => {
      try {
        await assignmentRepository.initialize();
        setAssignments(assignmentRepository.getAssignments());
        console.log("AssignmentContext initialized with assignments from repository");
      } catch (error) {
        console.error("Failed to initialize AssignmentContext:", error);
      }
    };

    initializeRepository();
  }, []);

  // Create a new assignment
  const createAssignment = useCallback((data: AssignmentData): string => {
    const created = assignmentRepository.createAssignment(data);
    setAssignments(assignmentRepository.getAssignments());
    console.log("Assignment created:", created.id);
    return created.id || "";
  }, []);

  // Create a draft (localStorage based)
  const createDraft = useCallback(
    (classId: string, data: AssignmentData): void => {
      const draftKey = `draft_assignment_${classId}`;
      localStorage.setItem(draftKey, JSON.stringify(data));
      console.log("Draft saved for class:", classId);
    },
    []
  );

  // Get assignment by ID
  const getAssignmentById = useCallback(
    (id: string): AssignmentData | undefined => {
      return assignments.find((a) => a.id === id);
    },
    [assignments]
  );

  // Get all assignments for a class
  const getAssignmentsByClass = useCallback(
    (_classId: string): AssignmentData[] => {
      // In a real app, this would filter by classId
      // For now, return all assignments
      return assignments;
    },
    [assignments]
  );

  // Get draft data from localStorage
  const getDraftByClass = useCallback(
    (classId: string): AssignmentData | undefined => {
      const draftKey = `draft_assignment_${classId}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
    []
  );

  // Update assignment
  const updateAssignment = useCallback(
    (id: string, data: Partial<AssignmentData>): boolean => {
      const success = assignmentRepository.updateAssignment(id, data);
      if (success) {
        setAssignments(assignmentRepository.getAssignments());
        console.log("Assignment updated:", id);
      } else {
        console.warn("Assignment not found:", id);
      }
      return success;
    },
    []
  );

  // Update draft
  const updateDraft = useCallback(
    (classId: string, data: Partial<AssignmentData>): void => {
      const draftKey = `draft_assignment_${classId}`;
      const existing = getDraftByClass(classId);
      const updated = { ...existing, ...data };
      localStorage.setItem(draftKey, JSON.stringify(updated));
      console.log("Draft updated for class:", classId);
    },
    [getDraftByClass]
  );

  // Delete assignment
  const deleteAssignment = useCallback((id: string): boolean => {
    const success = assignmentRepository.deleteAssignment(id);
    if (success) {
      setAssignments(assignmentRepository.getAssignments());
      console.log("Assignment deleted:", id);
    } else {
      console.warn("Assignment not found:", id);
    }
    return success;
  }, []);

  // Delete draft
  const deleteDraft = useCallback((classId: string): void => {
    const draftKey = `draft_assignment_${classId}`;
    localStorage.removeItem(draftKey);
    console.log("Draft deleted for class:", classId);
  }, []);

  // Get draft data (alternative method)
  const getDraftData = useCallback(
    (classId: string): AssignmentData | null => {
      const draftKey = `draft_assignment_${classId}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
      return null;
    },
    []
  );

  // Publish assignment (change status from draft to published)
  const publishAssignment = useCallback(
    (id: string): boolean => {
      return updateAssignment(id, { status: "published" });
    },
    [updateAssignment]
  );

  // Archive assignment (change status to archived)
  const archiveAssignment = useCallback(
    (id: string): boolean => {
      return updateAssignment(id, { status: "archived" });
    },
    [updateAssignment]
  );

  return (
    <AssignmentContext.Provider
      value={{
        assignments,
        createAssignment,
        createDraft,
        getAssignmentById,
        getAssignmentsByClass,
        getDraftByClass,
        updateAssignment,
        updateDraft,
        deleteAssignment,
        deleteDraft,
        getDraftData,
        publishAssignment,
        archiveAssignment,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentContext);
  if (!context) {
    throw new Error(
      "useAssignments must be used within an AssignmentProvider"
    );
  }
  return context;
}
