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
    instructions: string;            // Processing instructions
    resource_url: string;            // URL of the repo / resource
    user_include_files: string[];            // URL of the repo / resource
    user_exclude_files: string[];            // URL of the repo / resource
    rubric: RubricCriterion[];       // List of rubric criteria
    ai?: AIKeyInfo;                  // Optional AI key info (only for USER mode with valid key)
    storage_provider?: string;
    storage_key?: string;
    checksum?: string;
    external_url?: string;
}

export interface SubmissionContentResource {
    resource_url: string;            // URL of the repo / resource
    storage_provider?: string;
    storage_key?: string;
    checksum?: string;
    external_url?: string;
}

// ----------------------------
// Rubric Criterion
// ----------------------------
export interface RubricCriterion {
    criterion: string;   // Description of the requirement
    weight: number;      // Weight for grading
}

// ----------------------------
// AI Key Info
// ----------------------------
export interface AIKeyInfo {
    provider: string;     // openai, anthropic, etc.
    api_key: string;       // decrypted key
    api_endpoint: string;  // API endpoint
    model: string;        // Model name
    label?: string;       // Optional label for teacher
}
