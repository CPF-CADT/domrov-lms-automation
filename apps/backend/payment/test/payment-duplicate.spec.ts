jest.mock('bakong-khqr', () => ({}), { virtual: true });
import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PaymentService } from '../src/payment.service';

describe('duplicate Bakong transaction errors', () => {
  function serviceRejecting(error: Error) {
    const service = Object.create(PaymentService.prototype) as any;
    service.dataSource = { transaction: jest.fn().mockRejectedValue(error) };
    return service;
  }

  it('maps a concurrent provider-reference conflict to HTTP 409', async () => {
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505', constraint: 'IDX_payment_provider_reference_unique',
    });
    const service = serviceRejecting(new QueryFailedError('UPDATE payments', [], driverError));
    try {
      await service.creditSuccessfulPayment({ id: 'payment-id' }, { hash: 'transaction-hash' });
      throw new Error('Expected duplicate receipt rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as Error).message).toContain('already been used for another payment');
    }
  });

  it('does not mislabel another unique constraint as a reused receipt', async () => {
    const driverError = Object.assign(new Error('duplicate wallet'), { code: '23505', constraint: 'wallet_user_unique' });
    const error = new QueryFailedError('INSERT wallet', [], driverError);
    await expect(serviceRejecting(error).creditSuccessfulPayment({}, {})).rejects.toBe(error);
  });

  it('preserves unrelated database errors', async () => {
    const error = new Error('database unavailable');
    await expect(serviceRejecting(error).creditSuccessfulPayment({}, {})).rejects.toBe(error);
  });
});
