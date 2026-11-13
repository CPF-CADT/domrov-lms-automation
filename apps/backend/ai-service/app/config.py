from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./ai.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    payment_service_url: str = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:3003")
    payment_service_token: str = os.getenv("PAYMENT_SERVICE_TOKEN", "")
    grpc_host: str = os.getenv("GRPC_HOST", "0.0.0.0")
    grpc_port: int = int(os.getenv("GRPC_PORT", "50051"))
    http_host: str = os.getenv("HTTP_HOST", "0.0.0.0")
    http_port: int = int(os.getenv("HTTP_PORT", "8080"))
    evaluation_timeout_seconds: int = int(os.getenv("EVALUATION_TIMEOUT_SECONDS", "600"))
    ai_admin_token: str = os.getenv("AI_ADMIN_TOKEN", "")
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/%2F")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "domrov.events")
    rabbitmq_exchange_type: str = os.getenv("RABBITMQ_EXCHANGE_TYPE", "topic")
    rabbitmq_queue: str = os.getenv("RABBITMQ_QUEUE", "ai-evaluation-worker")
    rabbitmq_job_routing_key: str = os.getenv("RABBITMQ_JOB_ROUTING_KEY", "evaluation.job")
    rabbitmq_completed_routing_key: str = os.getenv("RABBITMQ_COMPLETED_ROUTING_KEY", "evaluation.completed")
    rabbitmq_failed_routing_key: str = os.getenv("RABBITMQ_FAILED_ROUTING_KEY", "evaluation.failed")
    rabbitmq_retry_queue: str = os.getenv("RABBITMQ_RETRY_QUEUE", "ai-evaluation-worker.retry")
    rabbitmq_dead_letter_queue: str = os.getenv("RABBITMQ_DEAD_LETTER_QUEUE", "ai-evaluation-worker.dlq")
    rabbitmq_retry_delay_ms: int = int(os.getenv("RABBITMQ_RETRY_DELAY_MS", "5000"))
    rabbitmq_max_retries: int = int(os.getenv("RABBITMQ_MAX_RETRIES", "3"))


settings = Settings()
