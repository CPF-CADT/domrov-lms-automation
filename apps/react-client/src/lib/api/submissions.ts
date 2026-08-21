// Mock implementations for submissions API

export interface SubmissionFile {
    name: string;
    size: number;
    uploadedAt: string;
    path: string;
}

export interface SubmissionLink {
    url: string;
    addedAt: string;
}

export interface Submission {
    id: string;
    assignmentId: string;
    userId: string;
    files: SubmissionFile[];
    links: SubmissionLink[];
    submittedAt: string;
}

export interface ExtractedFile {
    name: string;
    path: string;
    content: string;
    type: 'file' | 'folder';
}

// Mock data
const mockSubmissions: Submission[] = [
    {
        id: '1',
        assignmentId: '1',
        userId: '1',
        files: [
            {
                name: 'main.py',
                size: 1024,
                uploadedAt: '2023-10-01T10:00:00Z',
                path: '/uploads/main.py'
            },
            {
                name: 'utils.py',
                size: 512,
                uploadedAt: '2023-10-01T10:05:00Z',
                path: '/uploads/utils.py'
            }
        ],
        links: [
            {
                url: 'https://github.com/example/repo',
                addedAt: '2023-10-01T10:10:00Z'
            }
        ],
        submittedAt: '2023-10-01T10:15:00Z'
    }
];

const mockExtractedFiles: ExtractedFile[] = [
    {
        name: 'main.py',
        path: 'main.py',
        content: 'print("Hello, World!")',
        type: 'file'
    },
    {
        name: 'utils.py',
        path: 'utils.py',
        content: 'def helper():\n    return "helper"',
        type: 'file'
    },
    {
        name: 'README.md',
        path: 'README.md',
        content: '# Project\n\nThis is a sample project.',
        type: 'file'
    }
];

// Mock functions
export async function fetchSubmissions(assignmentId: string, userId: string): Promise<Submission[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock submissions for the given assignment and user
    return mockSubmissions.filter(sub => sub.assignmentId === assignmentId && sub.userId === userId);
}

export async function extractZipFile(): Promise<ExtractedFile[]> {
    // Simulate extraction delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock extracted files
    return mockExtractedFiles;
}