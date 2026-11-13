package execution

import "time"

type File struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type Limits struct {
	TimeoutMs      int    `json:"timeoutMs"`
	MemoryMb       int    `json:"memoryMb"`
	CpuLimit       string `json:"cpuLimit"`
	MaxOutputBytes int    `json:"maxOutputBytes"`
}

type Request struct {
	ExecutionID  string `json:"executionId"`
	SubmissionID string `json:"submissionId"`
	SnapshotID   string `json:"snapshotId"`
	TeacherID    string `json:"teacherId"`
	Language     string `json:"language"`
	Command      string `json:"command"`
	Stdin        string `json:"stdin"`
	Files        []File `json:"files"`
	Limits       Limits `json:"limits"`
}

type Result struct {
	ExecutionID  string    `json:"executionId"`
	SubmissionID string    `json:"submissionId"`
	TeacherID    string    `json:"teacherId"`
	Status       string    `json:"status"`
	Stdout       string    `json:"stdout,omitempty"`
	Stderr       string    `json:"stderr,omitempty"`
	ExitCode     int       `json:"exitCode"`
	ErrorCode    string    `json:"errorCode,omitempty"`
	DurationMs   int64     `json:"durationMs"`
	CreatedAt    time.Time `json:"createdAt"`
	StartedAt    time.Time `json:"startedAt,omitempty"`
	CompletedAt  time.Time `json:"completedAt,omitempty"`
}

const (
	Queued       = "QUEUED"
	Running      = "RUNNING"
	Completed    = "COMPLETED"
	CompileError = "COMPILE_ERROR"
	RuntimeError = "RUNTIME_ERROR"
	Timeout      = "TIMEOUT"
	Cancelled    = "CANCELLED"
	Failed       = "FAILED"
)
