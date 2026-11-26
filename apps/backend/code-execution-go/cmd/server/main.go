package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/domrov/code-execution/internal/execution"
	"github.com/domrov/code-execution/internal/messaging"
	"github.com/domrov/code-execution/internal/observability"
	"github.com/domrov/code-execution/internal/store"
)

type server struct {
	db        executionRepository
	broker    executionPublisher
	sandbox   execution.Sandbox
	logger    *observability.Logger
	jwtSecret string
	mu        sync.Mutex
	cancel    map[string]context.CancelFunc
}

type executionRepository interface {
	Create(context.Context, execution.Request) error
	Get(context.Context, string) (execution.Result, error)
}

type executionPublisher interface {
	Publish(context.Context, string, any) error
}

func main() {
	ctx := context.Background()
	logger := observability.NewLogger(os.Stdout, os.Stderr, env("LOG_LEVEL", "info"))
	if !strings.EqualFold(os.Getenv("OTEL_SDK_DISABLED"), "true") {
		if err := logger.EnableTelemetry(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")); err != nil {
			logger.Log(ctx, slog.LevelWarn, "telemetry.config.invalid", "OTLP export is disabled because the endpoint is invalid")
		}
	}
	started := time.Now()
	logger.Log(ctx, slog.LevelInfo, "service.starting", "Starting code execution service")
	databaseURL := env("DATABASE_URL", "postgresql://domrov:domrov@localhost:5432/execution_db")
	db, err := store.Open(ctx, databaseURL)
	if err != nil {
		logger.Log(ctx, observability.LevelFatal, "service.startup.failed", "Could not initialize PostgreSQL",
			slog.String("dependency", "postgres"), observability.ErrorCode(err, "POSTGRESQL_STARTUP_FAILED"), observability.Duration(started))
		os.Exit(1)
	}
	logger.Log(ctx, slog.LevelInfo, "dependency.connected", "PostgreSQL initialized",
		slog.String("dependency", "postgres"), observability.Duration(started))
	defer db.Close()
	b, err := openBroker(ctx, logger)
	if err != nil {
		os.Exit(1)
	}
	defer b.Close()
	s := &server{db: db, broker: b, logger: logger, sandbox: execution.Sandbox{DockerBinary: env("DOCKER_BINARY", "docker"), WorkspaceRoot: env("WORKSPACE_ROOT", "")}, jwtSecret: env("JWT_ACCESS_SECRET", "local-access-secret"), cancel: make(map[string]context.CancelFunc)}
	runExecution := func(runCtx context.Context, req execution.Request) execution.Result {
		jobCtx, cancel := context.WithCancel(runCtx)
		s.mu.Lock()
		s.cancel[req.ExecutionID] = cancel
		s.mu.Unlock()
		defer func() { s.mu.Lock(); delete(s.cancel, req.ExecutionID); s.mu.Unlock() }()
		if err := db.MarkStarted(jobCtx, req.ExecutionID, time.Now().UTC()); err != nil {
			logger.Log(jobCtx, slog.LevelError, "execution.mark_started.failed", "Could not persist execution start",
				slog.String("dependency", "postgres"), observability.ErrorCode(err, "MARK_STARTED_FAILED"))
		}
		return s.sandbox.Run(jobCtx, req)
	}
	go runExecutionConsumer(ctx, logger, func() {
		b.Consume(ctx, runExecution, db)
	})
	addr := ":" + env("PORT", "3005")
	httpServer := &http.Server{
		Addr:     addr,
		Handler:  s.routes(),
		ErrorLog: log.New(httpErrorWriter{logger: logger}, "", 0),
	}
	listener, err := net.Listen("tcp", httpServer.Addr)
	if err != nil {
		logger.Log(ctx, observability.LevelFatal, "service.startup.failed", "Could not bind HTTP listener",
			observability.ErrorCode(err, "HTTP_BIND_FAILED"))
		os.Exit(1)
	}
	logger.Log(ctx, slog.LevelInfo, "service.ready", "Code execution HTTP server listening", observability.Duration(started))
	if err := httpServer.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Log(ctx, observability.LevelFatal, "service.serve.failed", "HTTP server stopped with an error",
			observability.ErrorCode(err, "HTTP_SERVE_FAILED"))
		os.Exit(1)
	}
}

func runExecutionConsumer(ctx context.Context, logger *observability.Logger, consume func()) {
	defer func() {
		if recover() != nil {
			logger.Log(ctx, observability.LevelFatal, "rabbitmq.consumer.panicked", "Execution consumer panicked",
				slog.String("dependency", "rabbitmq"), slog.String("error_code", "CONSUMER_PANIC"))
			// Preserve process termination on an uncaught worker panic without printing its value or stack.
			os.Exit(2)
		}
	}()
	consume()
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health/live", s.health)
	mux.HandleFunc("/health/ready", s.ready)
	mux.HandleFunc("/executions", s.executions)
	mux.HandleFunc("/executions/", s.executionByID)
	return s.logger.HTTP(s.withAuth(mux))
}

type httpErrorWriter struct{ logger *observability.Logger }

func (w httpErrorWriter) Write(message []byte) (int, error) {
	w.logger.Log(context.Background(), slog.LevelError, "http.server.error", "HTTP server reported an internal error",
		slog.String("error_code", "HTTP_SERVER_ERROR"))
	return len(message), nil
}

func openBroker(ctx context.Context, logger *observability.Logger) (*messaging.Broker, error) {
	started := time.Now()
	b, err := messaging.Connect(env("RABBITMQ_URL", "amqp://domrov:domrov@localhost:5672/%2f"), env("RABBITMQ_EXECUTION_QUEUE", "domrov.code.execution.worker"), env("RABBITMQ_EVENTS_EXCHANGE", "domrov.events"), logger)
	if err != nil {
		logger.Log(ctx, observability.LevelFatal, "service.startup.failed", "Could not initialize RabbitMQ",
			slog.String("dependency", "rabbitmq"), observability.ErrorCode(err, "RABBITMQ_STARTUP_FAILED"), observability.Duration(started))
		return nil, err
	}
	logger.Log(ctx, slog.LevelInfo, "dependency.connected", "RabbitMQ initialized",
		slog.String("dependency", "rabbitmq"), observability.Duration(started))
	return b, nil
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]string{"status": "ok", "service": "code-execution"})
}
func (s *server) ready(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]string{"status": "ok", "service": "code-execution", "database": "connected"})
}

func (s *server) executions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, 405, "Method not allowed")
		return
	}
	var req execution.Request
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 7<<20)).Decode(&req); err != nil {
		writeError(w, 400, "Invalid execution request")
		return
	}
	claims, ok := claimsFromRequest(r, s.jwtSecret)
	if !ok {
		writeError(w, 401, "Authentication required")
		return
	}
	if req.TeacherID == "" {
		req.TeacherID = claims.subject
	}
	if req.TeacherID != claims.subject {
		writeError(w, 403, "Execution owner mismatch")
		return
	}
	if req.ExecutionID == "" {
		req.ExecutionID = fmt.Sprintf("exec-%d", time.Now().UnixNano())
	}
	if err := s.db.Create(r.Context(), req); err != nil {
		s.logger.Log(r.Context(), slog.LevelError, "execution.create.failed", "Could not persist execution request",
			slog.String("dependency", "postgres"), observability.ErrorCode(err, "CREATE_EXECUTION_FAILED"))
		writeError(w, 500, "Could not create execution")
		return
	}
	if err := s.broker.Publish(r.Context(), "code.execution.requested", req); err != nil {
		writeError(w, 503, "Execution queue unavailable")
		return
	}
	writeJSON(w, 202, map[string]string{"executionId": req.ExecutionID, "status": execution.Queued})
}

func (s *server) executionByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/executions/")
	if id == "" {
		writeError(w, 404, "Execution not found")
		return
	}
	claims, ok := claimsFromRequest(r, s.jwtSecret)
	if !ok {
		writeError(w, 401, "Authentication required")
		return
	}
	if r.Method == http.MethodGet {
		result, err := s.db.Get(r.Context(), id)
		if err != nil {
			s.logExecutionReadError(r.Context(), err)
			writeError(w, 404, "Execution not found")
			return
		}
		if result.TeacherID != "" && result.TeacherID != claims.subject {
			writeError(w, 403, "Execution access denied")
			return
		}
		writeJSON(w, 200, result)
		return
	}
	if r.Method == http.MethodPost && strings.HasSuffix(id, "/cancel") {
		executionID := strings.TrimSuffix(id, "/cancel")
		stored, err := s.db.Get(r.Context(), executionID)
		if err != nil {
			s.logExecutionReadError(r.Context(), err)
			writeError(w, 404, "Execution not found")
			return
		}
		if stored.TeacherID != claims.subject {
			writeError(w, 403, "Execution access denied")
			return
		}
		s.mu.Lock()
		cancel := s.cancel[executionID]
		s.mu.Unlock()
		if cancel == nil {
			writeError(w, 409, "Execution is already complete or not running")
			return
		}
		cancel()
		s.logger.Log(r.Context(), slog.LevelInfo, "execution.cancel.requested", "Requested execution cancellation")
		writeJSON(w, http.StatusAccepted, map[string]string{"executionId": executionID, "status": execution.Cancelled})
		return
	}
	writeError(w, 405, "Method not allowed")
}

func (s *server) logExecutionReadError(ctx context.Context, err error) {
	if !errors.Is(err, sql.ErrNoRows) {
		s.logger.Log(ctx, slog.LevelError, "execution.read.failed", "Could not read execution",
			slog.String("dependency", "postgres"), observability.ErrorCode(err, "READ_EXECUTION_FAILED"))
	}
}

type claims struct{ subject string }

func claimsFromRequest(r *http.Request, secret string) (claims, bool) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return claims{}, false
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return claims{}, false
	}
	var body struct {
		Sub json.RawMessage `json:"sub"`
	}
	if json.Unmarshal(raw, &body) != nil || len(body.Sub) == 0 {
		return claims{}, false
	}
	var subject string
	if json.Unmarshal(body.Sub, &subject) != nil {
		var numeric int64
		if json.Unmarshal(body.Sub, &numeric) != nil {
			return claims{}, false
		}
		subject = strconv.FormatInt(numeric, 10)
	}
	if subject == "" {
		return claims{}, false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0] + "." + parts[1]))
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(mac.Sum(nil), sig) {
		return claims{}, false
	}
	return claims{subject: subject}, true
}
func (s *server) withAuth(next http.Handler) http.Handler { return next }
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"statusCode": status, "message": message})
}
func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
