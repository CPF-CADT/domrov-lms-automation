import { PaymentRabbitController } from '../src/messaging/rabbitmq';
import { PaymentEventsPublisher } from '../src/messaging/payment-events';
import { of } from 'rxjs';

const context = () => { const channel = { ack: jest.fn(), nack: jest.fn() }; return { getChannelRef: () => channel, getMessage: () => ({}) } as any; };

describe('Payment RabbitMQ integration', () => {
  it('publishes durable payment event envelopes with correlation and idempotency fields', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const publisher = new PaymentEventsPublisher({ emit } as any);
    await publisher.publish('payment.completed', { paymentId: 'pay-1', userId: 'u-1' }, 'pay-1');
    expect(emit).toHaveBeenCalledWith('payment.completed', expect.objectContaining({ eventType: 'payment.completed', correlationId: 'pay-1', idempotencyKey: 'payment-event:pay-1:payment.completed', payload: { paymentId: 'pay-1', userId: 'u-1' } }));
  });

  it('handles credit.reserve and acknowledges successful requests', async () => {
    const payments = { reserve: jest.fn().mockResolvedValue({ reservationId: 'res-1', status: 'reserved' }) } as any;
    const controller = new PaymentRabbitController(payments);
    const rmq = context();
    await expect(controller.reserve({ idempotencyKey: 'evaluation:eval-1', payload: { userId: 'u-1', amount: 2, referenceId: 'eval-1' } } as any, rmq)).resolves.toEqual({ reservationId: 'res-1', status: 'reserved' });
    expect(payments.reserve).toHaveBeenCalledWith({ userId: 'u-1', amount: 2, referenceId: 'eval-1' }, 'evaluation:eval-1');
    expect(rmq.getChannelRef().ack).toHaveBeenCalled();
  });

  it('nacks failed credit commands without requeueing invalid messages', async () => {
    const payments = { transition: jest.fn().mockRejectedValue(new Error('missing reservation')) } as any;
    const controller = new PaymentRabbitController(payments);
    const rmq = context();
    await expect(controller.release({ idempotencyKey: 'evaluation:eval-1:release', payload: { reservationId: 'missing' } } as any, rmq)).rejects.toThrow('missing reservation');
    expect(rmq.getChannelRef().nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });
});
