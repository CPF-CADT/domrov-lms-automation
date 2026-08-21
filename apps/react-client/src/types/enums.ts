// User & Class enums - using const objects for erasableSyntaxOnly compatibility
export const UserRole = {
    Teacher: 'Teacher',
    Student: 'Student',
    TeacherAssistant: 'TeacherAssistant',
    ClassMonitor: 'ClassMonitor',
    AcademicStaff: 'AcademicStaff',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserStatus = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BANNED: 'BANNED',
} as const;
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const ClassStatus = {
    BEING_START: 'BEING_START',
    ACTIVE: 'ACTIVE',
    END: 'END',
} as const;
export type ClassStatus = typeof ClassStatus[keyof typeof ClassStatus];

// Submission enums
export const SubmissionType = {
    INDIVIDUAL: 'INDIVIDUAL',
    TEAM: 'TEAM',
} as const;
export type SubmissionType = typeof SubmissionType[keyof typeof SubmissionType];

export const SubmissionMethod = {
    ZIP: 'ZIP',
    GITHUB: 'GITHUB',
    ANY: 'ANY',
} as const;
export type SubmissionMethod = typeof SubmissionMethod[keyof typeof SubmissionMethod];

export const SubmissionStatus = {
    PENDING: 'PENDING',
    SUBMITTED: 'SUBMITTED',
    GRADED: 'GRADED',
    RESUBMITTED: 'RESUBMITTED',
    LATE: 'LATE',
} as const;
export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];

// Resource & Feedback enums
export const ResourceType = {
    FILE: 'FILE',
    URL: 'URL',
    VIDEO: 'VIDEO',
    IMAGE: 'IMAGE',
    DOCUMENT: 'DOCUMENT',
    TEXT: 'TEXT',
    OTHER: 'OTHER',
} as const;
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];

export const FeedbackType = {
    SUGGESTION: 'suggestion',
    WARNING: 'warning',
    ERROR: 'error',
} as const;
export type FeedbackType = typeof FeedbackType[keyof typeof FeedbackType];

// AI enums
export const AIModelSelectionMode = {
    USER: 'USER',
    SYSTEM: 'SYSTEM',
    NONE: 'NONE',
} as const;
export type AIModelSelectionMode = typeof AIModelSelectionMode[keyof typeof AIModelSelectionMode];

// Evaluation type
export const EvaluationType = {
    AI: 'AI',
    MANUAL: 'MANUAL',
} as const;
export type EvaluationType = typeof EvaluationType[keyof typeof EvaluationType];
