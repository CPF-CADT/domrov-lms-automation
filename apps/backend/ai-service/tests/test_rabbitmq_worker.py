import json
import sys
import types
from types import SimpleNamespace

from app.rabbitmq_worker import RabbitMQWorker, decode_job, handle_message


class FakeChannel:
    def __init__(self):
        self.published = []
        self.acks = []
        self.rejects = []
        self.topology = []

    def basic_publish(self, **kwargs):
        self.published.append(kwargs)

    def basic_ack(self, **kwargs):
        self.acks.append(kwargs)

    def basic_reject(self, **kwargs):
        self.rejects.append(kwargs)

    def exchange_declare(self, **kwargs):
        self.topology.append(("exchange", kwargs))

    def queue_declare(self, **kwargs):
        self.topology.append(("queue", kwargs))

    def queue_bind(self, **kwargs):
        self.topology.append(("bind", kwargs))

    def basic_qos(self, **kwargs):
        self.topology.append(("qos", kwargs))


class FakeStore:
    def __init__(self, record):
        self.record = record

    def get(self, evaluation_id):
        return self.record


def config(**overrides):
    values = {
        "database_url": "sqlite:///test.db",
        "rabbitmq_exchange": "domrov.events",
        "rabbitmq_exchange_type": "topic",
        "rabbitmq_queue": "ai-evaluation-worker",
        "rabbitmq_job_routing_key": "evaluation.job",
        "rabbitmq_completed_routing_key": "evaluation.completed",
        "rabbitmq_failed_routing_key": "evaluation.failed",
        "rabbitmq_retry_queue": "ai-evaluation-worker.retry",
        "rabbitmq_dead_letter_queue": "ai-evaluation-worker.dlq",
        "rabbitmq_retry_delay_ms": 100,
        "rabbitmq_max_retries": 2,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def install_fake_pika(monkeypatch):
    class BasicProperties:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    monkeypatch.setitem(sys.modules, "pika", types.SimpleNamespace(BasicProperties=BasicProperties))


def test_decode_job_supports_envelope_and_properties():
    props = SimpleNamespace(correlation_id="corr-prop", headers={"x-retry-count": 1})
    message = decode_job(b'{"evaluationId":"eval-1","payload":{"user_id":"user-1"}}', props)
    assert message.evaluation_id == "eval-1"
    assert message.correlation_id == "corr-prop"
    assert message.retry_count == 1
    assert message.payload["evaluation_id"] == "eval-1"


def test_decode_job_supports_nest_packet_and_camel_case_payload():
    body = json.dumps({"pattern": "evaluation.job", "data": {"evaluationId": "eval-2", "userId": "user-2", "submissionId": "sub-2"}})
    message = decode_job(body)
    assert message.evaluation_id == "eval-2"
    assert message.payload["user_id"] == "user-2"
    assert message.payload["submission_id"] == "sub-2"


def test_success_publishes_completed_and_acknowledges(monkeypatch):
    install_fake_pika(monkeypatch)
    channel = FakeChannel()
    method = SimpleNamespace(delivery_tag=7)
    record = {"evaluation_id": "eval-1", "submission_id": "sub-1", "status": "COMPLETED", "score": 91.0, "feedback": "great", "error_code": ""}
    seen = []

    handle_message(
        channel,
        method,
        SimpleNamespace(correlation_id="corr-1", headers={}),
        json.dumps({"evaluationId": "eval-1", "payload": {"submission_id": "sub-1"}}).encode(),
        evaluator=lambda payload: seen.append(payload),
        store_factory=lambda _: FakeStore(record),
        config=config(),
    )

    assert seen[0]["evaluation_id"] == "eval-1"
    assert channel.acks == [{"delivery_tag": 7}]
    assert len(channel.published) == 1
    packet = json.loads(channel.published[0]["body"])
    event = packet["data"]
    assert channel.published[0]["routing_key"] == "evaluation.completed"
    assert event["correlationId"] == "corr-1"
    assert event["evaluationId"] == "eval-1"
    assert event["payload"]["score"] == 91.0


def test_transient_failure_publishes_retry_and_acknowledges(monkeypatch):
    install_fake_pika(monkeypatch)
    channel = FakeChannel()
    handle_message(
        channel,
        SimpleNamespace(delivery_tag=8),
        SimpleNamespace(correlation_id="corr-2", headers={}),
        b'{"evaluationId":"eval-2","payload":{}}',
        evaluator=lambda _: (_ for _ in ()).throw(RuntimeError("temporary")),
        config=config(rabbitmq_max_retries=2),
    )
    assert channel.acks == [{"delivery_tag": 8}]
    assert channel.published[0]["routing_key"] == "evaluation.retry"
    assert channel.published[0]["properties"].headers == {"x-retry-count": 1}


def test_exhausted_failure_publishes_failed_and_acknowledges(monkeypatch):
    install_fake_pika(monkeypatch)
    channel = FakeChannel()
    handle_message(
        channel,
        SimpleNamespace(delivery_tag=9),
        SimpleNamespace(correlation_id="corr-3", headers={"x-retry-count": 2}),
        b'{"evaluationId":"eval-3","payload":{}}',
        evaluator=lambda _: (_ for _ in ()).throw(RuntimeError("permanent")),
        config=config(rabbitmq_max_retries=2),
    )
    assert channel.acks == [{"delivery_tag": 9}]
    assert channel.published[0]["routing_key"] == "evaluation.failed"
    packet = json.loads(channel.published[0]["body"])
    event = packet["data"]
    assert event["correlationId"] == "corr-3"
    assert event["evaluationId"] == "eval-3"


def test_invalid_message_is_rejected_without_requeue(monkeypatch):
    install_fake_pika(monkeypatch)
    channel = FakeChannel()
    handle_message(channel, SimpleNamespace(delivery_tag=10), None, b"not-json", config=config())
    assert channel.rejects == [{"delivery_tag": 10, "requeue": False}]
    assert channel.acks == []


def test_topology_is_durable_and_manual_ack_is_configured():
    channel = FakeChannel()
    RabbitMQWorker(config())._declare_topology(channel)
    assert channel.topology[0][1]["durable"] is True
    retry_queue = next(item for kind, item in channel.topology if kind == "queue" and item["queue"] == "ai-evaluation-worker.retry")
    assert retry_queue["arguments"]["x-message-ttl"] == 100
    assert retry_queue["arguments"]["x-dead-letter-routing-key"] == "evaluation.job"
    assert channel.topology[-1] == ("qos", {"prefetch_count": 1})
