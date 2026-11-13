"""RabbitMQ worker compatible with the NestJS RMQ migration.

The existing evaluator entry point is intentionally reused so HTTP, gRPC, and
Redis/RQ modes remain available during migration.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from typing import Any, Callable

from app.config import settings
from app.db import EvaluationStore
from app.worker import process_evaluation

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class RabbitMessage:
    payload: dict[str, Any]
    correlation_id: str
    evaluation_id: str
    retry_count: int


def decode_job(body: bytes | str, properties: Any = None) -> RabbitMessage:
    """Decode an envelope or a bare evaluation payload."""
    raw = json.loads(body.decode("utf-8") if isinstance(body, bytes) else body)
    if not isinstance(raw, dict):
        raise ValueError("evaluation.job payload must be a JSON object")
    payload = raw.get("payload") if isinstance(raw.get("payload"), dict) else raw
    evaluation_id = str(
        raw.get("evaluationId")
        or raw.get("evaluation_id")
        or payload.get("evaluationId")
        or payload.get("evaluation_id")
        or ""
    )
    if not evaluation_id:
        raise ValueError("evaluation.job is missing evaluationId")
    correlation_id = str(
        getattr(properties, "correlation_id", None)
        or raw.get("correlationId")
        or raw.get("correlation_id")
        or payload.get("correlationId")
        or evaluation_id
    )
    headers = getattr(properties, "headers", None) or raw.get("headers") or {}
    retry_count = int(headers.get("x-retry-count", raw.get("retryCount", 0)) or 0)
    normalized = dict(payload)
    normalized["evaluation_id"] = evaluation_id
    normalized.setdefault("request_id", correlation_id)
    return RabbitMessage(normalized, correlation_id, evaluation_id, retry_count)


def _event(event_type: str, message: RabbitMessage, *, status: str, **payload: Any) -> bytes:
    return json.dumps(
        {
            "messageId": str(uuid.uuid4()),
            "correlationId": message.correlation_id,
            "evaluationId": message.evaluation_id,
            "eventType": event_type,
            "status": status,
            "producer": "ai-service",
            "payload": payload,
        },
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")


def _publish(channel: Any, exchange: str, routing_key: str, body: bytes, *, headers: dict[str, Any] | None = None) -> None:
    # Lazy import keeps existing test/HTTP/gRPC modes independent of RabbitMQ.
    from pika import BasicProperties

    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=body,
        properties=BasicProperties(content_type="application/json", delivery_mode=2, headers=headers or {}),
    )


def _publish_result(channel: Any, message: RabbitMessage, record: dict[str, Any], config: Any) -> None:
    completed = record.get("status") == "COMPLETED"
    _publish(
        channel,
        config.rabbitmq_exchange,
        config.rabbitmq_completed_routing_key if completed else config.rabbitmq_failed_routing_key,
        _event(
            "evaluation.completed" if completed else "evaluation.failed",
            message,
            status=str(record.get("status", "FAILED")).lower(),
            score=record.get("score"),
            feedback=record.get("feedback", ""),
            errorCode=record.get("error_code", ""),
            submissionId=record.get("submission_id"),
        ),
    )


def handle_message(
    channel: Any,
    method: Any,
    properties: Any,
    body: bytes,
    *,
    evaluator: Callable[[dict[str, Any]], Any] = process_evaluation,
    store_factory: Callable[[str], EvaluationStore] = EvaluationStore,
    config: Any = settings,
) -> None:
    """Process one delivery and explicitly ACK, reject, or retry it."""
    delivery_tag = method.delivery_tag
    try:
        message = decode_job(body, properties)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        LOGGER.error("rejecting invalid evaluation.job: %s", exc)
        channel.basic_reject(delivery_tag=delivery_tag, requeue=False)
        return

    try:
        evaluator(message.payload)
        record = store_factory(config.database_url).get(message.evaluation_id)
        if not record:
            raise RuntimeError("evaluation result was not persisted")
        _publish_result(channel, message, record, config)
        channel.basic_ack(delivery_tag=delivery_tag)
    except Exception as exc:  # noqa: BLE001 - classify failures at transport boundary
        LOGGER.exception("RabbitMQ evaluation failed", extra={"evaluation_id": message.evaluation_id})
        if message.retry_count < config.rabbitmq_max_retries:
            retry_body = json.dumps(
                {
                    "correlationId": message.correlation_id,
                    "evaluationId": message.evaluation_id,
                    "payload": message.payload,
                },
                separators=(",", ":"),
            ).encode("utf-8")
            _publish(
                channel,
                config.rabbitmq_exchange,
                "evaluation.retry",
                retry_body,
                headers={"x-retry-count": message.retry_count + 1},
            )
            channel.basic_ack(delivery_tag=delivery_tag)
        else:
            _publish(
                channel,
                config.rabbitmq_exchange,
                config.rabbitmq_failed_routing_key,
                _event("evaluation.failed", message, status="failed", errorCode="EVALUATION_FAILED", error=str(exc)),
            )
            channel.basic_ack(delivery_tag=delivery_tag)


class RabbitMQWorker:
    def __init__(self, config: Any = settings):
        self.config = config

    def _declare_topology(self, channel: Any) -> None:
        config = self.config
        channel.exchange_declare(exchange=config.rabbitmq_exchange, exchange_type=config.rabbitmq_exchange_type, durable=True)
        channel.queue_declare(queue=config.rabbitmq_queue, durable=True)
        channel.queue_bind(queue=config.rabbitmq_queue, exchange=config.rabbitmq_exchange, routing_key=config.rabbitmq_job_routing_key)
        channel.queue_declare(
            queue=config.rabbitmq_retry_queue,
            durable=True,
            arguments={
                "x-message-ttl": config.rabbitmq_retry_delay_ms,
                "x-dead-letter-exchange": config.rabbitmq_exchange,
                "x-dead-letter-routing-key": config.rabbitmq_job_routing_key,
            },
        )
        channel.queue_bind(queue=config.rabbitmq_retry_queue, exchange=config.rabbitmq_exchange, routing_key="evaluation.retry")
        channel.queue_declare(queue=config.rabbitmq_dead_letter_queue, durable=True)
        channel.queue_bind(queue=config.rabbitmq_dead_letter_queue, exchange=config.rabbitmq_exchange, routing_key=config.rabbitmq_failed_routing_key)
        channel.basic_qos(prefetch_count=1)

    def run(self) -> None:
        import pika

        connection = pika.BlockingConnection(pika.URLParameters(self.config.rabbitmq_url))
        channel = connection.channel()
        self._declare_topology(channel)
        channel.basic_consume(
            queue=self.config.rabbitmq_queue,
            on_message_callback=lambda ch, method, properties, body: handle_message(
                ch, method, properties, body, config=self.config
            ),
            auto_ack=False,
        )
        LOGGER.info("consuming RabbitMQ queue %s", self.config.rabbitmq_queue)
        try:
            channel.start_consuming()
        finally:
            if connection.is_open:
                connection.close()
