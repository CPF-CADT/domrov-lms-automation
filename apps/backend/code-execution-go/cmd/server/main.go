package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/domrov/code-execution/internal/execution"
	"github.com/domrov/code-execution/internal/messaging"
	"github.com/domrov/code-execution/internal/store"
)

type server struct {
	db        *store.Store
	broker    *messaging.Broker
	sandbox   execution.Sandbox
	jwtSecret string
	mu        sync.Mutex
	cancel    map[string]context.CancelFunc
}

func main() {
	ctx := context.Background()
	databaseURL := env("DATABASE_URL", "postgresql://domrov:domrov@localhost:5432/execution_db")
	db, err := store.Open(ctx, databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	b := mustBroker()
	defer b.Close()
	s := &server{db: db, broker: b, sandbox: execution.Sandbox{DockerBinary: env("DOCKER_BINARY", "docker"), WorkspaceRoot: env("WORKSPACE_ROOT", "")}, jwtSecret: env("JWT_ACCESS_SECRET", "local-access-secret"), cancel: make(map[string]context.CancelFunc)}
	go b.Consume(ctx, func(runCtx context.Context, req execution.Request) execution.Result {
		jobCtx, cancel := context.WithCancel(runCtx)
		s.mu.Lock()
		s.cancel[req.ExecutionID] = cancel
		s.mu.Unlock()
		defer func() { s.mu.Lock(); delete(s.cancel, req.ExecutionID); s.mu.Unlock() }()
		_ = db.MarkStarted(jobCtx, req.ExecutionID, time.Now().UTC())
		return s.sandbox.Run(jobCtx, req)
	}, db)
	mux := http.NewServeMux()
	mux.HandleFunc("/health/live", s.health)
	mux.HandleFunc("/health/ready", s.ready)
	mux.HandleFunc("/executions", s.executions)
	mux.HandleFunc("/executions/", s.executionByID)
	addr := ":" + env("PORT", "3005")
	log.Printf("code execution service listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, s.withAuth(mux)))
}

func mustBroker() *messaging.Broker {
	b, err := messaging.Connect(env("RABBITMQ_URL", "amqp://domrov:domrov@localhost:5672/%2f"), env("RABBITMQ_EXECUTION_QUEUE", "domrov.code.execution.worker"), env("RABBITMQ_EVENTS_EXCHANGE", "domrov.events"))
	if err != nil {
		log.Fatal(err)
	}
	return b
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
		writeJSON(w, http.StatusAccepted, map[string]string{"executionId": executionID, "status": execution.Cancelled})
		return
	}
	writeError(w, 405, "Method not allowed")
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
