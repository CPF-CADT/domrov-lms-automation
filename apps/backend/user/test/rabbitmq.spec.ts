import { Test } from '@nestjs/testing'
import {
  AuthEventsPublisher,
  AUTH_EVENTS_CLIENT,
} from '../src/messaging/rabbitmq'
import { of } from 'rxjs'

describe('Auth RabbitMQ integration', () => {
  it('publishes an idempotent user event envelope', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined))
    const module = await Test.createTestingModule({
      providers: [
        AuthEventsPublisher,
        { provide: AUTH_EVENTS_CLIENT, useValue: { emit } },
      ],
    }).compile()
    const publisher = module.get(AuthEventsPublisher)
    await publisher.publish(
      'user.created',
      { userId: 7, email: 'user@example.com' },
      '7',
    )
    expect(emit).toHaveBeenCalledWith(
      'user.created',
      expect.objectContaining({
        eventType: 'user.created',
        correlationId: '7',
        idempotencyKey: 'user-event:7:user.created',
      }),
    )
    expect(AUTH_EVENTS_CLIENT).toBe('AUTH_EVENTS_CLIENT')
  })
})
