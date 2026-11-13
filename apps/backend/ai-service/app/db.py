from sqlalchemy import Column, Float, Integer, MetaData, String, Table, Text, create_engine, select, update

metadata = MetaData()
evaluations = Table(
    "evaluations", metadata,
    Column("evaluation_id", String(128), primary_key=True),
    Column("submission_id", String(128), nullable=False),
    Column("assignment_id", String(128), nullable=False),
    Column("user_id", String(128), nullable=False),
    Column("language", String(64), nullable=False),
    Column("resource_key", Text, nullable=False),
    Column("status", String(32), nullable=False),
    Column("score", Float),
    Column("feedback", Text, nullable=False, default=""),
    Column("error_code", String(64), nullable=False, default=""),
    Column("request_id", String(128), nullable=False),
    Column("attempts", Integer, nullable=False, default=0),
)


class EvaluationStore:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url, future=True)
        metadata.create_all(self.engine)

    def create(self, record: dict) -> None:
        with self.engine.begin() as connection:
            connection.execute(evaluations.insert().values(**record))

    def get(self, evaluation_id: str) -> dict | None:
        with self.engine.connect() as connection:
            row = connection.execute(select(evaluations).where(evaluations.c.evaluation_id == evaluation_id)).mappings().first()
            return dict(row) if row else None

    def update(self, evaluation_id: str, **values: object) -> None:
        if values:
            with self.engine.begin() as connection:
                connection.execute(update(evaluations).where(evaluations.c.evaluation_id == evaluation_id).values(**values))

    def update_by_submission(self, submission_id: str, **values: object) -> bool:
        """Apply a legacy result callback without taking ownership of Academic data."""
        if not values:
            return False
        with self.engine.begin() as connection:
            result = connection.execute(
                update(evaluations)
                .where(evaluations.c.submission_id == submission_id)
                .values(**values)
            )
            return result.rowcount > 0
