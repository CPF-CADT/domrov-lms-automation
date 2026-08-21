import type { AssignmentData } from "@/context/AssignmentContext";

/**
 * AssignmentRepository - Service layer for managing assignment data
 * This service loads mock data from assignments.json and provides CRUD operations
 * All components use this single repository to ensure data consistency
 * Custom assignments are persisted to localStorage
 */
class AssignmentRepository {
  private assignments: AssignmentData[] = [];
  private isInitialized = false;
  private readonly CUSTOM_ASSIGNMENTS_KEY = "custom_assignments_v1";

  /**
   * Initialize the repository by loading data from the JSON file and localStorage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("✅ AssignmentRepository already initialized");
      return;
    }

    try {
      const response = await fetch("/data/assignments.json");
      if (!response.ok) {
        throw new Error(`Failed to load assignments.json: ${response.statusText}`);
      }
      const data = await response.json();
      this.assignments = [...data];
      
      // Load custom assignments from localStorage
      const customAssignments = this.loadCustomAssignments();
      this.assignments.push(...customAssignments);
      
      this.isInitialized = true;
      console.log(`✅ AssignmentRepository initialized with ${this.assignments.length} assignments (${customAssignments.length} custom)`);
    } catch (error) {
      console.error("❌ Failed to initialize AssignmentRepository:", error);
      // Fallback to empty array if file fails to load
      this.assignments = [];
      this.isInitialized = true;
    }
  }

  /**
   * Load custom assignments from localStorage
   */
  private loadCustomAssignments(): AssignmentData[] {
    try {
      const stored = localStorage.getItem(this.CUSTOM_ASSIGNMENTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load custom assignments from localStorage:", error);
    }
    return [];
  }

  /**
   * Save custom assignments to localStorage
   */
  private saveCustomAssignments(): void {
    try {
      // Only save assignments that have IDs starting with "assignment_" (created by user)
      const customAssignments = this.assignments.filter(
        (a) => a.id?.startsWith("assignment_")
      );
      localStorage.setItem(this.CUSTOM_ASSIGNMENTS_KEY, JSON.stringify(customAssignments));
    } catch (error) {
      console.warn("Failed to save custom assignments to localStorage:", error);
    }
  }

  /**
   * Get all assignments
   */
  getAssignments(): AssignmentData[] {
    return [...this.assignments]; // Return a copy to prevent external mutations
  }

  /**
   * Get assignment by ID
   */
  getAssignmentById(id: string): AssignmentData | undefined {
    return this.assignments.find((a) => a.id === id);
  }

  /**
   * Get all assignments for a specific class
   * (In a real app, assignments would have a classId field)
   */
  getAssignmentsByClass(_classId: string): AssignmentData[] {
    // For now, return all assignments
    // In production, would filter by classId
    return [...this.assignments];
  }

  /**
   * Create a new assignment
   * Generates a unique ID using timestamp
   */
  createAssignment(data: Omit<AssignmentData, "id">): AssignmentData {
    const newId = `assignment_${Date.now()}`;
    const newAssignment: AssignmentData = {
      ...data,
      id: newId,
      status: data.status || "draft",
      submissionRate: data.submissionRate ?? 0,
    };

    this.assignments.push(newAssignment);
    this.saveCustomAssignments(); // Persist to localStorage
    console.log(`✅ Assignment created: ${newId}`);
    this.logAssignments();

    return newAssignment;
  }

  /**
   * Update an existing assignment
   */
  updateAssignment(id: string, data: Partial<AssignmentData>): boolean {
    const index = this.assignments.findIndex((a) => a.id === id);
    if (index === -1) {
      console.warn(`❌ Assignment not found: ${id}`);
      return false;
    }

    this.assignments[index] = {
      ...this.assignments[index],
      ...data,
      id: this.assignments[index].id, // Prevent ID from being changed
    };

    // Save custom assignments to localStorage if this is a custom assignment
    if (id.startsWith("assignment_")) {
      this.saveCustomAssignments();
    }

    console.log(`✏️ Assignment updated: ${id}`);
    this.logAssignments();

    return true;
  }

  /**
   * Delete an assignment
   */
  deleteAssignment(id: string): boolean {
    const index = this.assignments.findIndex((a) => a.id === id);
    if (index === -1) {
      console.warn(`❌ Assignment not found: ${id}`);
      return false;
    }

    this.assignments.splice(index, 1);
    
    // Save custom assignments to localStorage if this was a custom assignment
    if (id.startsWith("assignment_")) {
      this.saveCustomAssignments();
    }

    console.log(`🗑️ Assignment deleted: ${id}`);
    this.logAssignments();

    return true;
  }

  /**
   * Publish an assignment (change status to published)
   */
  publishAssignment(id: string): boolean {
    return this.updateAssignment(id, { status: "published" });
  }

  /**
   * Archive an assignment (change status to archived)
   */
  archiveAssignment(id: string): boolean {
    return this.updateAssignment(id, { status: "archived" });
  }

  /**
   * Get count of assignments by status
   */
  getCountByStatus(status: "draft" | "published" | "archived"): number {
    return this.assignments.filter((a) => a.status === status).length;
  }

  /**
   * Get assignments by status
   */
  getAssignmentsByStatus(status: "draft" | "published" | "archived"): AssignmentData[] {
    return this.assignments.filter((a) => a.status === status);
  }

  /**
   * Log current assignments to console for debugging
   */
  private logAssignments(): void {
    console.log("📋 Current assignments:", this.assignments);
  }

  /**
   * Clear all assignments (useful for testing)
   */
  clear(): void {
    this.assignments = [];
    this.isInitialized = false;
    console.log("🧹 AssignmentRepository cleared");
  }
}

// Export singleton instance
export const assignmentRepository = new AssignmentRepository();
