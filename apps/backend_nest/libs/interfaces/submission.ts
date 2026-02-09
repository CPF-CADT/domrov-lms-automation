// ----------------------------
// Request
// ----------------------------
export interface SubmissionContentRequest {
    submission_id: string; // ID of the submission
}

// ----------------------------
// Response
// ----------------------------
export interface SubmissionContentResponse {
    submission_id: string;           // Submission ID
    instrctions: string;            // Processing instrctions
    resource_url: string;            // URL of the repo / resource
    rubric: RubricCriterion[];       // List of rubric criteria
}

// ----------------------------
// Rubric Criterion
// ----------------------------
export interface RubricCriterion {
    criterion: string;   // Description of the requirement
    weight: number;      // Weight for grading
}
