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


settings = Settings()
