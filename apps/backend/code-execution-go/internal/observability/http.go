package observability

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

func (l *Logger) HTTP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := WithIDs(r.Context(), r.Header.Get("X-Request-Id"), r.Header.Get("X-Correlation-Id"))
		ids := ContextIDs(ctx)
		w.Header().Set("X-Request-Id", ids.RequestID)
		w.Header().Set("X-Correlation-Id", ids.CorrelationID)
		started := time.Now()
		route := routeName(r.Method, r.URL.Path)
		ctx, span := l.startHTTP(ctx, methodName(r.Method), route, r.Header.Get("traceparent"))
		writer := &statusWriter{ResponseWriter: w}
		defer func() {
			fault := recover()
			if fault != nil && fault != http.ErrAbortHandler {
				span.endHTTP(http.StatusInternalServerError)
				l.Log(ctx, slog.LevelError, "http.request.panicked", "HTTP handler panicked",
					slog.String("http_method", methodName(r.Method)), slog.String("route", route),
					slog.String("error_code", "HANDLER_PANIC"), Duration(started))
				// Let net/http abort the response without logging the panic value or stack.
				panic(http.ErrAbortHandler)
			}
			status := writer.status
			aborted := fault == http.ErrAbortHandler || errors.Is(r.Context().Err(), context.Canceled)
			message := "HTTP request completed"
			if aborted {
				status = 499
				message = "HTTP request aborted"
			}
			if status == 0 {
				status = http.StatusOK
			}
			span.endHTTP(status)
			if status < 400 && (route == "/health/live" || route == "/health/ready") {
				return
			}
			level := slog.LevelInfo
			switch {
			case status >= 500:
				level = slog.LevelError
			case status >= 400:
				level = slog.LevelWarn
			}
			l.Log(ctx, level, "http.request.completed", message,
				slog.String("http_method", methodName(r.Method)), slog.String("route", route),
				slog.Int("status_code", status), slog.Bool("aborted", aborted), Duration(started))
			if fault == http.ErrAbortHandler {
				panic(http.ErrAbortHandler)
			}
		}()
		next.ServeHTTP(writer, r.WithContext(ctx))
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	if w.status == 0 && (status >= 200 || status == http.StatusSwitchingProtocols) {
		w.status = status
	}
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(body)
}

func (w *statusWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }

func routeName(method, path string) string {
	switch {
	case path == "/health/live", path == "/health/ready", path == "/executions":
		return path
	case method == http.MethodPost && strings.HasPrefix(path, "/executions/") && strings.HasSuffix(path, "/cancel"):
		return "/executions/:executionId/cancel"
	case strings.HasPrefix(path, "/executions/"):
		return "/executions/:executionId"
	default:
		return "unmatched"
	}
}

func methodName(method string) string {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut,
		http.MethodPatch, http.MethodDelete, http.MethodOptions:
		return method
	default:
		return "OTHER"
	}
}
