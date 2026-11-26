package observability

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"log/slog"
	"regexp"
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

func safeField(attr slog.Attr) bool {
	switch attr.Key {
	case "dependency", "operation", "outcome", "error_code", "routing_key", "stage":
		return attr.Value.Kind() == slog.KindString && tokenPattern.MatchString(attr.Value.String())
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
