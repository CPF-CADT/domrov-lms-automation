package messaging

import (
	"context"
	"encoding/json"
	"github.com/domrov/code-execution/internal/execution"
	"github.com/domrov/code-execution/internal/store"
	"github.com/rabbitmq/amqp091-go"
	"log"
)

type Broker struct {
	conn     *amqp091.Connection
	channel  *amqp091.Channel
	queue    string
	exchange string
}

func Connect(url, queue, exchange string) (*Broker, error) {
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
	if err = channel.QueueBind(queue, "code.execution.requested", exchange, false, nil); err != nil {
		return nil, err
	}
	return &Broker{conn: conn, channel: channel, queue: queue, exchange: exchange}, nil
}

func (b *Broker) Close() { _ = b.channel.Close(); _ = b.conn.Close() }

func (b *Broker) Publish(ctx context.Context, routingKey string, value any) error {
	body, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return b.channel.PublishWithContext(ctx, b.exchange, routingKey, false, false, amqp091.Publishing{ContentType: "application/json", DeliveryMode: amqp091.Persistent, Body: body})
}

func (b *Broker) Consume(ctx context.Context, runner func(context.Context, execution.Request) execution.Result, db *store.Store) {
	deliveries, err := b.channel.Consume(b.queue, "code-execution", false, false, false, false, nil)
	if err != nil {
		log.Printf("rabbit consumer: %v", err)
		return
	}
	log.Printf("rabbit consumer connected to queue %s", b.queue)
	for {
		select {
		case <-ctx.Done():
			return
		case delivery, ok := <-deliveries:
			if !ok {
				log.Printf("rabbit consumer: delivery channel closed")
				return
			}
			log.Printf("rabbit consumer received execution message")
			req, err := decodeRequest(delivery.Body)
			if err != nil || req.ExecutionID == "" {
				log.Printf("rabbit consumer: invalid execution request: %v", err)
				_ = delivery.Nack(false, false)
				continue
			}
			if err := db.Create(ctx, req); err != nil {
				log.Printf("rabbit consumer: could not create execution %s: %v", req.ExecutionID, err)
				_ = delivery.Nack(false, true)
				continue
			}
			result := runner(ctx, req)
			_ = db.SaveResult(ctx, result)
			_ = b.Publish(ctx, "code.execution.completed", result)
			_ = delivery.Ack(false)
		}
	}
}

// NestJS RMQ clients wrap emitted events as { pattern, data }. The academic
// publisher puts the versioned event envelope inside data. Direct publishers
// may send either the envelope or the request itself, so accept all forms at
// this boundary while keeping one canonical execution.Request internally.
func decodeRequest(body []byte) (execution.Request, error) {
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
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return execution.Request{}, err
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
