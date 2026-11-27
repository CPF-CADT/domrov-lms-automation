package observability

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

func TestFailureLogs(t *testing.T) {
	var output bytes.Buffer
	logger := NewLogger(&output, &output, "info")
	const privateDetail = "example secret from dependency"
	logger.LogError(context.Background(), slog.LevelError, "test.failed", "Test operation failed", errors.New(privateDetail))
	var event map[string]any
	if err := json.Unmarshal(output.Bytes(), &event); err != nil {
		t.Fatal(err)
	}
	if event["error_type"] != "Error" || event["error_message"] != unexpectedException || event["error_function"] != "observability.TestFailureLogs" || strings.Contains(output.String(), privateDetail) {
		t.Fatalf("unexpected error log: %s", output.String())
	}

	output.Reset()
	var panicLine int
	handler := logger.HTTP(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		_, _, panicLine, _ = runtime.Caller(0)
		panic(privateDetail)
	}))
	func() {
		defer func() {
			if fault := recover(); fault != http.ErrAbortHandler {
				t.Fatalf("expected the HTTP abort sentinel, got %v", fault)
			}
		}()
		handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/executions", nil))
	}()
	event = nil
	if err := json.Unmarshal(output.Bytes(), &event); err != nil {
		t.Fatal(err)
	}
	wantLocation := "src/internal/observability/log_test.go:" + strconv.Itoa(panicLine+1)
	function, _ := event["error_function"].(string)
	if event["error_type"] != "Panic" || event["error_location"] != wantLocation || !strings.HasPrefix(function, "observability.TestFailureLogs.") || event["aborted"] != true || event["request_id"] == nil || strings.Contains(output.String(), privateDetail) {
		t.Fatalf("unexpected panic log: %s, want location %s", output.String(), wantLocation)
	}
}

func TestHTTPFailureCombinesExceptionAndResponse(t *testing.T) {
	var output bytes.Buffer
	logger := NewLogger(&output, &output, "info")
	handler := logger.HTTP(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.LogError(r.Context(), slog.LevelError, "execution.create.failed", "Could not create execution", errors.New("private error"), slog.Int("status_code", 418))
		w.WriteHeader(http.StatusInternalServerError)
	}))
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/executions", nil))
	var event map[string]any
	if err := json.Unmarshal(output.Bytes(), &event); err != nil {
		t.Fatal(err)
	}
	if event["event"] != "http.request.completed" || event["error_event"] != "execution.create.failed" || event["status_code"] != float64(500) || event["error_function"] == nil || strings.Contains(output.String(), "private error") {
		t.Fatalf("unexpected combined log: %s", output.String())
	}
}
