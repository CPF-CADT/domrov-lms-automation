from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, MetaData, String, Table, Text, create_engine, select, update
from sqlalchemy.dialects.postgresql import UUID

Identifier = String(128).with_variant(UUID(as_uuid=False), "postgresql")

metadata = MetaData()
evaluations = Table(
    "evaluations", metadata,
    Column("evaluation_id", Identifier, primary_key=True),
    Column("submission_id", Identifier, nullable=False),
    Column("assignment_id", Identifier, nullable=False),
    Column("user_id", Identifier, nullable=False),
    Column("language", String(64), nullable=False),
    Column("resource_key", Text, nullable=False),
    Column("status", String(32), nullable=False),
    Column("score", Float),
    Column("feedback", Text, nullable=False, default=""),
    Column("error_code", String(64), nullable=False, default=""),
    Column("request_id", Identifier, nullable=False),
    Column("attempts", Integer, nullable=False, default=0),
)

evaluation_logs = Table(
    "evaluation_logs", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("evaluation_id", Identifier, nullable=False),
    Column("submission_id", Identifier, nullable=False),
    Column("event", String(64), nullable=False),
    Column("status", String(32), nullable=False),
    Column("details", Text, nullable=False, default=""),
    Column("created_at", DateTime(timezone=True), nullable=False),
)


class EvaluationStore:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url, future=True)
        metadata.create_all(self.engine)

    def healthcheck(self) -> None:
        with self.engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

    def create(self, record: dict) -> None:
        with self.engine.begin() as connection:
            connection.execute(evaluations.insert().values(**record))
            connection.execute(evaluation_logs.insert().values(
                evaluation_id=record["evaluation_id"], submission_id=record["submission_id"],
                event="created", status=record["status"], details="", created_at=datetime.now(timezone.utc),
            ))

    def get(self, evaluation_id: str) -> dict | None:
        with self.engine.connect() as connection:
            row = connection.execute(select(evaluations).where(evaluations.c.evaluation_id == evaluation_id)).mappings().first()
            return dict(row) if row else None

    def update(self, evaluation_id: str, **values: object) -> None:
        if values:
            with self.engine.begin() as connection:
                current = connection.execute(select(evaluations).where(evaluations.c.evaluation_id == evaluation_id)).mappings().first()
                connection.execute(update(evaluations).where(evaluations.c.evaluation_id == evaluation_id).values(**values))
                if current and ("status" in values or "error_code" in values or "score" in values):
                    status = str(values.get("status", current["status"]))
                    event = "status_changed" if status != current["status"] else "result_updated"
                    details = str(values.get("error_code", "") or "")
                    connection.execute(evaluation_logs.insert().values(
                        evaluation_id=evaluation_id, submission_id=current["submission_id"], event=event,
                        status=status, details=details, created_at=datetime.now(timezone.utc),
                    ))

    def update_by_submission(self, submission_id: str, **values: object) -> bool:
        """Apply a legacy result callback without taking ownership of Academic data."""
        if not values:
            return False
        with self.engine.begin() as connection:
            current = connection.execute(select(evaluations).where(evaluations.c.submission_id == submission_id)).mappings().first()
            result = connection.execute(
                update(evaluations)
                .where(evaluations.c.submission_id == submission_id)
                .values(**values)
            )
            if current and result.rowcount > 0:
                status = str(values.get("status", current["status"]))
                connection.execute(evaluation_logs.insert().values(
                    evaluation_id=current["evaluation_id"], submission_id=submission_id,
                    event="legacy_result_callback", status=status,
                    details=str(values.get("error_code", "") or ""), created_at=datetime.now(timezone.utc),
                ))
            return result.rowcount > 0

    def list(self, *, status: str | None = None, limit: int = 100) -> list[dict]:
        statement = select(evaluations).order_by(evaluations.c.evaluation_id.desc()).limit(min(max(limit, 1), 500))
        if status:
            statement = statement.where(evaluations.c.status == status)
        with self.engine.connect() as connection:
            return [dict(row) for row in connection.execute(statement).mappings().all()]

    def list_logs(self, *, evaluation_id: str | None = None, limit: int = 100) -> list[dict]:
        statement = select(evaluation_logs).order_by(evaluation_logs.c.id.asc()).limit(min(max(limit, 1), 500))
        if evaluation_id:
            statement = statement.where(evaluation_logs.c.evaluation_id == evaluation_id)
        with self.engine.connect() as connection:
            return [dict(row) for row in connection.execute(statement).mappings().all()]

    def usage_summary(self) -> dict:
        with self.engine.connect() as connection:
            rows = connection.execute(select(evaluations)).mappings().all()
        by_status: dict[str, int] = {}
        by_language: dict[str, int] = {}
        scores = []
        for row in rows:
            by_status[row["status"]] = by_status.get(row["status"], 0) + 1
            by_language[row["language"]] = by_language.get(row["language"], 0) + 1
            if row["score"] is not None:
                scores.append(float(row["score"]))
        return {
            "totalEvaluations": len(rows), "byStatus": by_status, "byLanguage": by_language,
            "totalAttempts": sum(int(row["attempts"] or 0) for row in rows),
            "averageScore": round(sum(scores) / len(scores), 2) if scores else None,
        }
