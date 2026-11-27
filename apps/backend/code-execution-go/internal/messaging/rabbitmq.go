package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"time"

	"github.com/domrov/code-execution/internal/execution"
	"github.com/domrov/code-execution/internal/observability"
	"github.com/rabbitmq/amqp091-go"
)

const (
	requestedRoutingKey = "code.execution.requested"
	completedRoutingKey = "code.execution.completed"
	requestIDHeader     = "x-request-id"
)

type Broker struct {
	conn     *amqp091.Connection
	channel  executionChannel
	queue    string
	exchange string
	logger   *observability.Logger
}

type executionChannel interface {
	Close() error
	Consume(queue, consumer string, autoAck, exclusive, noLocal, noWait bool, args amqp091.Table) (<-chan amqp091.Delivery, error)
	PublishWithContext(ctx context.Context, exchange, key string, mandatory, immediate bool, msg amqp091.Publishing) error
}

type executionStore interface {
	Create(context.Context, execution.Request) error
	SaveResult(context.Context, execution.Result) error
}

func Connect(url, queue, exchange string, logger *observability.Logger) (*Broker, error) {
	conn, err := amqp091.Dial(url)
	if err != nil {
		return nil, err
	}
	channel, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	if err = channel.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		return nil, err
	}
	if _, err = channel.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		return nil, err
	}
	if err = channel.QueueBind(queue, requestedRoutingKey, exchange, false, nil); err != nil {
		return nil, err
	}
	return &Broker{conn: conn, channel: channel, queue: queue, exchange: exchange, logger: logger}, nil
}

func (b *Broker) Close() { _ = b.channel.Close(); _ = b.conn.Close() }

func (b *Broker) Publish(ctx context.Context, routingKey string, value any) error {
	ctx, span := b.logger.StartPublish(ctx, routingKey)
	started := time.Now()
	err := b.publish(ctx, routingKey, value)
	span.End(err != nil)
	fields := []slog.Attr{slog.String("dependency", "rabbitmq"), slog.String("routing_key", routingKey), observability.Duration(started)}
	if err != nil {
		var timeout net.Error
		if errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &timeout) && timeout.Timeout()) {
			b.logger.LogError(ctx, slog.LevelWarn, "rabbitmq.publish.timeout", "Timed out publishing execution message", err,
				append(fields, slog.String("error_code", "PUBLISH_TIMEOUT"))...)
		} else {
			b.logger.LogError(ctx, slog.LevelError, "rabbitmq.publish.failed", "Could not publish execution message", err,
				append(fields, observability.ErrorCode(err, "PUBLISH_FAILED"))...)
		}
		return err
	}
	b.logger.Log(ctx, slog.LevelDebug, "rabbitmq.publish.completed", "Published execution message", fields...)
	return nil
}

func (b *Broker) publish(ctx context.Context, routingKey string, value any) error {
	body, err := json.Marshal(value)
	if err != nil {
		return err
	}
	ids := observability.ContextIDs(ctx)
	headers := amqp091.Table{requestIDHeader: ids.RequestID}
	if traceparent := observability.Traceparent(ctx); traceparent != "" {
		headers["traceparent"] = traceparent
	}
	return b.channel.PublishWithContext(ctx, b.exchange, routingKey, false, false, amqp091.Publishing{
		ContentType:   "application/json",
		DeliveryMode:  amqp091.Persistent,
		CorrelationId: ids.CorrelationID,
		Headers:       headers,
		Body:          body,
	})
}

func (b *Broker) Consume(ctx context.Context, runner func(context.Context, execution.Request) execution.Result, db executionStore) {
	started := time.Now()
	deliveries, err := b.channel.Consume(b.queue, "code-execution", false, false, false, false, nil)
	if err != nil {
		b.logger.LogError(ctx, slog.LevelError, "rabbitmq.consumer.start.failed", "Could not start execution consumer", err,
			slog.String("dependency", "rabbitmq"), observability.ErrorCode(err, "CONSUMER_START_FAILED"), observability.Duration(started))
		return
	}
	b.logger.Log(ctx, slog.LevelInfo, "rabbitmq.consumer.started", "Execution consumer started",
		slog.String("dependency", "rabbitmq"), observability.Duration(started))
	for {
		select {
		case <-ctx.Done():
			b.logger.Log(ctx, slog.LevelInfo, "rabbitmq.consumer.stopped", "Execution consumer stopped",
				slog.String("dependency", "rabbitmq"))
			return
		case delivery, ok := <-deliveries:
			if !ok {
				b.logger.Log(ctx, slog.LevelError, "rabbitmq.consumer.closed", "Execution delivery channel closed",
					slog.String("dependency", "rabbitmq"), slog.String("error_code", "DELIVERY_CHANNEL_CLOSED"))
				return
			}
			b.handleDelivery(ctx, delivery, runner, db)
		}
	}
}

func (b *Broker) handleDelivery(ctx context.Context, delivery amqp091.Delivery, runner func(context.Context, execution.Request) execution.Result, db executionStore) {
	started := time.Now()
	var metadata executionEventMetadata
	req, err := decodeRequest(delivery.Body, &metadata)
	ctx = deliveryContext(ctx, delivery, metadata)
	traceparent, _ := delivery.Headers["traceparent"].(string)
	ctx, span := b.logger.StartConsume(ctx, requestedRoutingKey, traceparent)
	failed := true
	defer func() { span.End(failed) }()
	fields := []slog.Attr{slog.String("routing_key", requestedRoutingKey), slog.Bool("redelivered", delivery.Redelivered)}
	if messageID := observability.ValidID(delivery.MessageId); messageID != "" {
		fields = append(fields, slog.String("message_id", messageID))
	} else if messageID := observability.ValidID(metadata.MessageID); messageID != "" {
		fields = append(fields, slog.String("message_id", messageID))
	}
	if err != nil || req.ExecutionID == "" {
		b.logger.Log(ctx, slog.LevelWarn, "rabbitmq.consume.ignored", "Invalid execution request",
			append(fields, slog.String("error_code", "INVALID_EXECUTION_REQUEST"), observability.Duration(started))...)
		b.reject(ctx, delivery, false)
		return
	}
	if err := db.Create(ctx, req); err != nil {
		b.logger.LogError(ctx, slog.LevelError, "rabbitmq.consume.failed", "Could not persist execution request", err,
			append(fields, slog.String("dependency", "postgres"), observability.ErrorCode(err, "CREATE_EXECUTION_FAILED"), observability.Duration(started))...)
		b.reject(ctx, delivery, true)
		return
	}
	runStarted := time.Now()
	b.logger.Log(ctx, slog.LevelDebug, "execution.started", "Started sandbox execution", fields...)
	runContext, runSpan := b.logger.StartExecution(ctx)
	result := runner(runContext, req)
	runSpan.EndExecution(string(result.Status), result.Status == execution.Failed ||
		result.Status == execution.Timeout || result.Status == execution.CompileError || result.Status == execution.RuntimeError)
	b.logResult(runContext, result, runStarted, fields)
	saveErr := db.SaveResult(ctx, result)
	if saveErr != nil {
		b.logger.LogError(ctx, slog.LevelError, "execution.result.save.failed", "Could not persist execution result", saveErr,
			append(fields, slog.String("dependency", "postgres"), observability.ErrorCode(saveErr, "SAVE_RESULT_FAILED"))...)
	}
	publishErr := b.Publish(ctx, completedRoutingKey, result)
	if err := delivery.Ack(false); err != nil {
		b.logger.LogError(ctx, slog.LevelError, "rabbitmq.consume.failed", "Could not acknowledge execution message", err,
			append(fields, observability.ErrorCode(err, "ACK_FAILED"))...)
		return
	}
	failed = saveErr != nil || publishErr != nil
	if !failed {
		b.logger.Log(ctx, slog.LevelDebug, "rabbitmq.consume.completed", "Acknowledged execution message",
			append(fields, observability.Duration(started))...)
	}
}

func (b *Broker) reject(ctx context.Context, delivery amqp091.Delivery, requeue bool) {
	err := delivery.Nack(false, requeue)
	if err != nil {
		b.logger.LogError(ctx, slog.LevelError, "rabbitmq.consume.failed", "Could not negatively acknowledge execution message", err,
			slog.String("routing_key", requestedRoutingKey), slog.Bool("requeue", requeue), observability.ErrorCode(err, "NACK_FAILED"))
	} else if requeue {
		b.logger.Log(ctx, slog.LevelWarn, "rabbitmq.message.requeued", "Requeued execution message",
			slog.String("routing_key", requestedRoutingKey), slog.Bool("redelivered", delivery.Redelivered))
	}
}

func (b *Broker) logResult(ctx context.Context, result execution.Result, started time.Time, deliveryFields []slog.Attr) {
	level := slog.LevelInfo
	switch result.Status {
	case execution.Failed:
		level = slog.LevelError
	case execution.Timeout, execution.CompileError, execution.RuntimeError:
		level = slog.LevelWarn
	}
	fields := append(deliveryFields, slog.String("outcome", result.Status), observability.Duration(started))
	if result.ErrorCode != "" {
		fields = append(fields, slog.String("error_code", result.ErrorCode))
	}
	b.logger.Log(ctx, level, "execution.finished", "Sandbox execution finished", fields...)
}

type executionEventMetadata struct {
	CorrelationID string
	MessageID     string
}

func deliveryContext(ctx context.Context, delivery amqp091.Delivery, metadata executionEventMetadata) context.Context {
	requestID, _ := delivery.Headers[requestIDHeader].(string)
	correlationID := observability.ValidID(metadata.CorrelationID)
	if correlationID == "" {
		correlationID = observability.ValidID(delivery.CorrelationId)
	}
	return observability.WithIDs(ctx, requestID, correlationID)
}

// NestJS RMQ clients wrap emitted events as { pattern, data }. The academic
// publisher puts the versioned event envelope inside data. Direct publishers
// may send either the envelope or the request itself, so accept all forms at
// this boundary while keeping one canonical execution.Request internally.
func decodeRequest(body []byte, metadata ...*executionEventMetadata) (execution.Request, error) {
	var packet struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &packet); err != nil {
		return execution.Request{}, err
	}
	if len(packet.Data) > 0 && string(packet.Data) != "null" {
		body = packet.Data
	}
	var envelope struct {
		CorrelationID json.RawMessage `json:"correlationId"`
		MessageID     json.RawMessage `json:"messageId"`
		Payload       json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return execution.Request{}, err
	}
	// Invalid optional metadata must not reject an otherwise valid request.
	if len(metadata) > 0 && metadata[0] != nil {
		_ = json.Unmarshal(envelope.CorrelationID, &metadata[0].CorrelationID)
		_ = json.Unmarshal(envelope.MessageID, &metadata[0].MessageID)
	}
	if len(envelope.Payload) > 0 && string(envelope.Payload) != "null" {
		body = envelope.Payload
	}

	// NestJS serializes numeric user IDs as JSON numbers. Normalize the
	// identity at the transport boundary so the worker uses one string type.
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(body, &fields); err != nil {
		return execution.Request{}, err
	}
	if rawSubject, ok := fields["teacherId"]; ok {
		var subject string
		if json.Unmarshal(rawSubject, &subject) != nil {
			var numeric json.Number
			if err := json.Unmarshal(rawSubject, &numeric); err != nil {
				return execution.Request{}, err
			}
			subject = numeric.String()
		}
		fields["teacherId"], _ = json.Marshal(subject)
	}
	normalized, err := json.Marshal(fields)
	if err != nil {
		return execution.Request{}, err
	}
	var request execution.Request
	if err := json.Unmarshal(normalized, &request); err != nil {
		return execution.Request{}, err
	}
	return request, nil
}
