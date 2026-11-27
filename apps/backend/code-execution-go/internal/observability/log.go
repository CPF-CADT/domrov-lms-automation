package observability

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"log/slog"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Logger struct {
	telemetry *telemetry
	standard  *slog.Logger
	failures  *slog.Logger
}

const LevelFatal = slog.LevelError + 4

var tokenPattern = regexp.MustCompile(`(?i)^[a-z][a-z0-9_.-]{0,79}$`)
var locationPattern = regexp.MustCompile(`^src/[a-zA-Z0-9_./-]+\.go:[0-9]{1,7}$`)
var functionPattern = regexp.MustCompile(`^[a-zA-Z_(][a-zA-Z0-9_.*()-]{0,119}$`)

const (
	unexpectedException = "Unexpected application exception"
	operationTimedOut   = "Operation timed out"
	operationCanceled   = "Operation was canceled"
	applicationPanic    = "Application panic"
	runtimePanic        = "Go runtime panic"
)

func NewLogger(stdout, stderr io.Writer, configuredLevel string) *Logger {
	level := slog.LevelInfo
	switch strings.ToLower(strings.TrimSpace(configuredLevel)) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	case "fatal":
		level = LevelFatal
	}
	options := &slog.HandlerOptions{
		Level: level,
		ReplaceAttr: func(_ []string, attr slog.Attr) slog.Attr {
			switch attr.Key {
			case slog.TimeKey:
				return slog.Time("timestamp", attr.Value.Time().UTC())
			case slog.LevelKey:
				if attr.Value.Any() == LevelFatal {
					return slog.String("level", "fatal")
				}
				return slog.String("level", strings.ToLower(attr.Value.String()))
			case slog.MessageKey:
				attr.Key = "message"
			}
			return attr
		},
	}
	return &Logger{
		standard: slog.New(slog.NewJSONHandler(stdout, options)),
		failures: slog.New(slog.NewJSONHandler(stderr, options)),
	}
}

// Log accepts controlled event names, messages and attributes. Never pass
// application payloads or raw errors to this boundary.
func (l *Logger) Log(ctx context.Context, level slog.Level, event, message string, attributes ...slog.Attr) {
	logger := l.standard
	if level >= slog.LevelError {
		logger = l.failures
	}
	if !logger.Enabled(ctx, level) {
		return
	}
	ids := ContextIDs(ctx)
	fields := []slog.Attr{slog.String("service", "code-execution"), slog.String("event", event)}
	if ids.RequestID != "" {
		fields = append(fields, slog.String("request_id", ids.RequestID))
	}
	if ids.CorrelationID != "" {
		fields = append(fields, slog.String("correlation_id", ids.CorrelationID))
	}
	if trace := spanContext(ctx); trace.sampled {
		fields = append(fields, slog.String("trace_id", trace.traceID), slog.String("span_id", trace.spanID))
	}
	for _, attr := range attributes {
		if safeField(attr) {
			fields = append(fields, attr)
		}
	}
	logger.LogAttrs(ctx, level, message, fields...)
}

// LogError records classified details and the application call site handling the error.
func (l *Logger) LogError(ctx context.Context, level slog.Level, event, message string, err error, attributes ...slog.Attr) {
	kind, summary := "Error", unexpectedException
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		kind, summary = "DeadlineExceeded", operationTimedOut
	case errors.Is(err, context.Canceled):
		kind, summary = "CanceledError", operationCanceled
	}
	location, function := failureFrame(false)
	attributes = append(attributes,
		slog.String("error_type", kind), slog.String("error_message", summary), slog.String("error_location", location), slog.String("error_function", function))
	if level < LevelFatal {
		if requestLog, ok := ctx.Value(requestLogKey{}).(*httpRequestLog); ok && requestLog.capture(level, event, message, attributes) {
			return
		}
	}
	l.Log(ctx, level, event, message, attributes...)
}

// LogPanic uses the application frame where the panic originated, when available.
func (l *Logger) LogPanic(ctx context.Context, level slog.Level, event, message string, fault any, attributes ...slog.Attr) {
	kind, summary := "Panic", applicationPanic
	if _, ok := fault.(runtime.Error); ok {
		kind, summary = "RuntimePanic", runtimePanic
	}
	location, function := failureFrame(true)
	l.Log(ctx, level, event, message, append(attributes,
		slog.String("error_type", kind), slog.String("error_message", summary), slog.String("error_location", location), slog.String("error_function", function))...)
}

func failureFrame(panicked bool) (string, string) {
	var pcs [32]uintptr
	n := runtime.Callers(3, pcs[:])
	if n == 0 {
		return "", ""
	}
	frames := runtime.CallersFrames(pcs[:n])
	var fallbackLocation, fallbackFunction string
	for {
		frame, more := frames.Next()
		if frame.Function == "runtime.gopanic" {
			panicked = false
		}
		if strings.HasPrefix(frame.Function, "github.com/domrov/code-execution/") || strings.HasPrefix(frame.Function, "main.") {
			path := filepath.ToSlash(frame.File)
			if start := max(strings.LastIndex(path, "/internal/"), strings.LastIndex(path, "/cmd/")); start >= 0 {
				location := "src" + path[start:] + ":" + strconv.Itoa(frame.Line)
				function := frame.Function[strings.LastIndex(frame.Function, "/")+1:]
				if !panicked {
					return location, function
				}
				if fallbackLocation == "" {
					fallbackLocation, fallbackFunction = location, function
				}
			}
		}
		if !more {
			break
		}
	}
	return fallbackLocation, fallbackFunction
}

func safeField(attr slog.Attr) bool {
	switch attr.Key {
	case "dependency", "operation", "outcome", "error_code", "error_type", "error_event", "routing_key", "stage":
		return attr.Value.Kind() == slog.KindString && tokenPattern.MatchString(attr.Value.String())
	case "error_message":
		switch attr.Value.String() {
		case unexpectedException, operationTimedOut, operationCanceled, applicationPanic, runtimePanic:
			return attr.Value.Kind() == slog.KindString
		}
	case "error_location":
		location := attr.Value.String()
		return attr.Value.Kind() == slog.KindString && len(location) <= 160 && locationPattern.MatchString(location)
	case "error_function":
		return attr.Value.Kind() == slog.KindString && functionPattern.MatchString(attr.Value.String())
	case "duration_ms", "status_code", "attempt":
		return attr.Value.Kind() == slog.KindInt64 && attr.Value.Int64() >= 0
	case "aborted", "redelivered", "requeue":
		return attr.Value.Kind() == slog.KindBool
	case "message_id":
		return attr.Value.Kind() == slog.KindString && ValidID(attr.Value.String()) != ""
	case "http_method":
		return attr.Value.Kind() == slog.KindString && methodName(attr.Value.String()) == attr.Value.String()
	case "route":
		switch attr.Value.String() {
		case "/health/live", "/health/ready", "/executions", "/executions/:executionId", "/executions/:executionId/cancel", "unmatched":
			return attr.Value.Kind() == slog.KindString
		}
	}
	return false
}

func Duration(started time.Time) slog.Attr {
	return slog.Int64("duration_ms", time.Since(started).Milliseconds())
}

func ErrorCode(err error, fallback string) slog.Attr {
	code := fallback
	if errors.Is(err, context.DeadlineExceeded) {
		code = "DEADLINE_EXCEEDED"
	} else if errors.Is(err, context.Canceled) {
		code = "CONTEXT_CANCELLED"
	}
	return slog.String("error_code", code)
}

type IDs struct {
	RequestID     string
	CorrelationID string
}

type idsKey struct{}

var idPattern = regexp.MustCompile(`(?i)^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$`)

func ValidID(value string) string {
	if idPattern.MatchString(value) {
		return strings.ToLower(value)
	}
	return ""
}

func WithIDs(ctx context.Context, requestID, correlationID string) context.Context {
	ids := IDs{RequestID: ValidID(requestID), CorrelationID: ValidID(correlationID)}
	if ids.RequestID == "" {
		var random [16]byte
		rand.Read(random[:])
		ids.RequestID = hex.EncodeToString(random[:])
	}
	if ids.CorrelationID == "" {
		ids.CorrelationID = ids.RequestID
	}
	return context.WithValue(ctx, idsKey{}, ids)
}

func ContextIDs(ctx context.Context) IDs {
	ids, _ := ctx.Value(idsKey{}).(IDs)
	return ids
}
