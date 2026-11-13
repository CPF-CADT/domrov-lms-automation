package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/domrov/code-execution/internal/execution"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type Store struct{ db *sql.DB }

func Open(ctx context.Context, databaseURL string) (*Store, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	if err = db.PingContext(ctx); err != nil {
		return nil, err
	}
	_, err = db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS execution_jobs (
        execution_id varchar(100) PRIMARY KEY, submission_id varchar(100) NOT NULL,
        teacher_id varchar(100) NOT NULL, status varchar(30) NOT NULL,
        payload jsonb NOT NULL, result jsonb, created_at timestamptz NOT NULL,
        started_at timestamptz, completed_at timestamptz)`)
	if err != nil {
		return nil, fmt.Errorf("create execution_jobs: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Create(ctx context.Context, req execution.Request) error {
	payload, err := json.Marshal(req)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO execution_jobs (execution_id, submission_id, teacher_id, status, payload, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (execution_id) DO NOTHING`, req.ExecutionID, req.SubmissionID, req.TeacherID, execution.Queued, payload, time.Now().UTC())
	return err
}

func (s *Store) MarkStarted(ctx context.Context, id string, started time.Time) error {
	_, err := s.db.ExecContext(ctx, `UPDATE execution_jobs SET status=$2, started_at=$3 WHERE execution_id=$1`, id, execution.Running, started)
	return err
}

func (s *Store) SaveResult(ctx context.Context, result execution.Result) error {
	payload, err := json.Marshal(result)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `UPDATE execution_jobs SET status=$2, result=$3, completed_at=$4 WHERE execution_id=$1`, result.ExecutionID, result.Status, payload, result.CompletedAt)
	return err
}

func (s *Store) Get(ctx context.Context, id string) (execution.Result, error) {
	var raw []byte
	var teacherID string
	var submissionID string
	var status string
	var created time.Time
	err := s.db.QueryRowContext(ctx, `SELECT submission_id, teacher_id, status, result, created_at FROM execution_jobs WHERE execution_id=$1`, id).Scan(&submissionID, &teacherID, &status, &raw, &created)
	if err != nil {
		return execution.Result{}, err
	}
	if len(raw) == 0 {
		return execution.Result{ExecutionID: id, SubmissionID: submissionID, TeacherID: teacherID, Status: status, CreatedAt: created}, nil
	}
	var result execution.Result
	if err := json.Unmarshal(raw, &result); err != nil {
		return execution.Result{}, err
	}
	if result.TeacherID == "" {
		result.TeacherID = teacherID
	}
	if result.SubmissionID == "" {
		result.SubmissionID = submissionID
	}
	return result, nil
}
