import { AuthEventsPublisher, AUTH_EVENTS_CLIENT } from '../src/messaging/rabbitmq';
import { of } from 'rxjs';

describe('Auth RabbitMQ integration', () => {
  it('publishes an idempotent user event envelope', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const publisher = new AuthEventsPublisher({ emit } as any);
    await publisher.publish('user.created', { userId: 7, email: 'user@example.com' }, '7');
    expect(emit).toHaveBeenCalledWith('user.created', expect.objectContaining({ eventType: 'user.created', correlationId: '7', idempotencyKey: 'auth-event:7:user.created' }));
    expect(AUTH_EVENTS_CLIENT).toBe('AUTH_EVENTS_CLIENT');
  });
});
