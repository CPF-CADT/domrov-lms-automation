package execution

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Sandbox struct {
	DockerBinary  string
	WorkspaceRoot string
}

var safePath = regexp.MustCompile(`^[a-zA-Z0-9._/ +-]+$`)

func imageFor(language string) (string, error) {
	switch strings.ToLower(language) {
	case "python":
		return "python:3.12-alpine", nil
	case "node", "javascript":
		return "node:22-alpine", nil
	case "c":
		return "gcc:14", nil
	case "cpp", "c++":
		return "gcc:14", nil
	case "java":
		return "eclipse-temurin:21-jdk", nil
	default:
		return "", fmt.Errorf("unsupported language: %s", language)
	}
}

func validateCommand(command string) error {
	trimmed := strings.TrimSpace(command)
	if trimmed == "" || len(trimmed) > 1000 {
		return fmt.Errorf("command is required and must be at most 1000 characters")
	}
	if strings.Contains(trimmed, "..") || strings.ContainsAny(trimmed, "\x00\r\n") {
		return fmt.Errorf("invalid command path")
	}
	for _, blocked := range []string{"sudo", "docker", "podman", "nsenter", "mount", "unshare", "/proc", "/sys", "/dev/tcp", "curl", "wget", "ssh", "nc"} {
		if strings.Contains(strings.ToLower(trimmed), blocked) {
			return fmt.Errorf("command contains blocked operation: %s", blocked)
		}
	}
	return nil
}

func validateFiles(files []File) error {
	if len(files) == 0 || len(files) > 100 {
		return fmt.Errorf("project must contain between 1 and 100 files")
	}
	var total int
	for _, file := range files {
		path := filepath.Clean(file.Path)
		if path == "." || filepath.IsAbs(path) || strings.HasPrefix(path, ".."+string(os.PathSeparator)) || !safePath.MatchString(file.Path) {
			return fmt.Errorf("invalid project path: %s", file.Path)
		}
		total += len(file.Content)
		if total > 5*1024*1024 {
			return fmt.Errorf("project exceeds 5 MiB")
		}
	}
	return nil
}

func (s Sandbox) Run(parent context.Context, req Request) Result {
	started := time.Now().UTC()
	result := Result{ExecutionID: req.ExecutionID, SubmissionID: req.SubmissionID, TeacherID: req.TeacherID, Status: Failed, CreatedAt: started, StartedAt: started}
	if err := validateCommand(req.Command); err != nil {
		result.ErrorCode = "INVALID_COMMAND"
		result.Stderr = err.Error()
		return result
	}
	if err := validateFiles(req.Files); err != nil {
		result.ErrorCode = "INVALID_PROJECT"
		result.Stderr = err.Error()
		return result
	}
	image, err := imageFor(req.Language)
	if err != nil {
		result.ErrorCode = "UNSUPPORTED_LANGUAGE"
		result.Stderr = err.Error()
		return result
	}
	timeoutMs := req.Limits.TimeoutMs
	if timeoutMs <= 0 || timeoutMs > 30000 {
		timeoutMs = 5000
	}
	memoryMb := req.Limits.MemoryMb
	if memoryMb <= 0 || memoryMb > 512 {
		memoryMb = 128
	}
	cpu := req.Limits.CpuLimit
	if cpu == "" {
		cpu = "0.5"
	}
	maxOutput := req.Limits.MaxOutputBytes
	if maxOutput <= 0 || maxOutput > 2*1024*1024 {
		maxOutput = 1024 * 1024
	}
	workspace, err := os.MkdirTemp(s.WorkspaceRoot, "domrov-execution-")
	if err != nil {
		result.ErrorCode = "SANDBOX_ERROR"
		result.Stderr = err.Error()
		return result
	}
	defer os.RemoveAll(workspace)
	for _, file := range req.Files {
		target := filepath.Join(workspace, filepath.Clean(file.Path))
		if err := os.MkdirAll(filepath.Dir(target), 0750); err != nil {
			result.ErrorCode = "SANDBOX_ERROR"
			result.Stderr = err.Error()
			return result
		}
		if err := os.WriteFile(target, []byte(file.Content), 0600); err != nil {
			result.ErrorCode = "SANDBOX_ERROR"
			result.Stderr = err.Error()
			return result
		}
	}
	ctx, cancel := context.WithTimeout(parent, time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()
	args := []string{"run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--memory", fmt.Sprintf("%dm", memoryMb), "--cpus", cpu, "--pids-limit", "64", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "-v", workspace + ":/workspace:rw", "-w", "/workspace", image, "sh", "-lc", req.Command}
	cmd := exec.CommandContext(ctx, s.DockerBinary, args...)
	cmd.Stdin = strings.NewReader(req.Stdin)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	result.DurationMs = time.Since(started).Milliseconds()
	result.CompletedAt = time.Now().UTC()
	result.Stdout = truncate(stdout.String(), maxOutput)
	result.Stderr = truncate(stderr.String(), maxOutput)
	if ctx.Err() == context.DeadlineExceeded {
		result.Status = Timeout
		result.ErrorCode = "TIME_LIMIT_EXCEEDED"
		return result
	}
	if ctx.Err() == context.Canceled {
		result.Status = Cancelled
		result.ErrorCode = "CANCELLED_BY_USER"
		return result
	}
	if err == nil {
		result.Status = Completed
		result.ExitCode = 0
		return result
	}
	if exitErr, ok := err.(*exec.ExitError); ok {
		result.ExitCode = exitErr.ExitCode()
	}
	if strings.Contains(strings.ToLower(result.Stderr), "error:") && (strings.Contains(req.Command, "gcc") || strings.Contains(req.Command, "g++") || strings.Contains(req.Command, "javac")) {
		result.Status = CompileError
		result.ErrorCode = "COMPILE_ERROR"
	} else {
		result.Status = RuntimeError
		result.ErrorCode = "RUNTIME_ERROR"
	}
	return result
}

func truncate(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit] + "\n[output truncated]"
}

func (r Result) HTTPStatus() int {
	if r.Status == Completed || r.Status == RuntimeError || r.Status == CompileError || r.Status == Timeout || r.Status == Cancelled {
		return 200
	}
	return 500
}
