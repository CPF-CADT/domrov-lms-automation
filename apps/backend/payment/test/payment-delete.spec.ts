jest.mock('bakong-khqr', () => ({}), { virtual: true });
import { PaymentService } from '../src/payment.service';

describe('delete pending payment', () => {
  function setup(status?: string) {
    const payment = status ? { id: 'payment-id', userId: 'owner', status } : null;
    const manager = { findOne: jest.fn().mockResolvedValue(payment), save: jest.fn() };
    const service = Object.create(PaymentService.prototype) as PaymentService;
    (service as any).dataSource = { transaction: (callback: any) => callback(manager) };
    return { service, manager, payment };
  }

  it('locks the owner record and cancels it without removing the audit record', async () => {
    const { service, manager, payment } = setup('pending');
    await expect(service.deletePendingPayment('owner', 'payment-id')).resolves.toEqual({ id: 'payment-id', deleted: true });
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 'payment-id', userId: 'owner' }, lock: { mode: 'pessimistic_write' },
    });
    expect(payment?.status).toBe('cancelled');
    expect(manager.save).toHaveBeenCalledWith(payment);
  });

  it.each(['completed', 'verifying', 'failed'])('refuses to delete a %s payment', async status => {
    const { service, manager } = setup(status);
    await expect(service.deletePendingPayment('owner', 'payment-id')).rejects.toThrow('Only pending payments');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('returns not found when the owner query finds no payment', async () => {
    const { service, manager } = setup();
    await expect(service.deletePendingPayment('other-user', 'payment-id')).rejects.toThrow('Payment not found');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('allows an idempotent retry of deletion', async () => {
    const { service, manager } = setup('cancelled');
    await expect(service.deletePendingPayment('owner', 'payment-id')).resolves.toMatchObject({ deleted: true });
    expect(manager.save).not.toHaveBeenCalled();
  });
});
