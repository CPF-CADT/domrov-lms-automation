import { PaymentService } from '../src/payment.service';

describe('Payment provider flow', () => {
  it('credits package plus bonus exactly once and emits PAID', async () => {
    const payment = { id: 'pay-1', userId: 'user-1', creditPackageId: 'pkg-1', amount: 2, currency: 'USD', status: 'pending', providerReference: 'md5' } as any;
    const payments = { findOne: jest.fn().mockResolvedValue(payment) };
    const provider = { checkPaymentByMd5: jest.fn().mockResolvedValue({ responseCode: 0, data: { hash: 'tx-1', amount: 2, currency: 'USD' } }) };
    const gateway = { sendStatus: jest.fn() };
    const manager = {
      findOne: jest.fn()
        .mockResolvedValueOnce({ ...payment })
        .mockResolvedValueOnce({ id: 'pkg-1', credits: 10, bonusCredits: 2 })
        .mockResolvedValueOnce({ userId: 'user-1', availableCredits: 3, reservedCredits: 0 }),
      save: jest.fn(async (value: any) => value),
      create: jest.fn((_type: unknown, value: unknown) => value),
    };
    const dataSource = { transaction: jest.fn(async (callback: (value: typeof manager) => Promise<void>) => callback(manager)) };
    const service = new PaymentService(
      {} as any, {} as any, payments as any, {} as any, {} as any, {} as any, dataSource as any, provider as any, gateway as any,
    );

    await expect(service.verifyPayment('user-1', 'pay-1')).resolves.toEqual({ paymentId: 'pay-1', status: 'PAID' });
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ availableCredits: 15 }));
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'credit', amount: 12 }));
    expect(gateway.sendStatus).toHaveBeenCalledWith('user-1', 'PAID');
    expect(payment.status).toBe('pending');
  });

  it('returns the idempotent create response without creating another provider payment', async () => {
    const response = { id: 'pay-1', status: 'pending', qr: 'qr' };
    const idempotency = { findOne: jest.fn().mockResolvedValue({ response }) };
    const provider = { createPaymentQr: jest.fn() };
    const service = new PaymentService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, provider as any, {} as any);
    (service as any).idempotency = idempotency;
    await expect(service.createPayment('user-1', 'pkg-1', 'key-1')).resolves.toEqual(response);
    expect(provider.createPaymentQr).not.toHaveBeenCalled();
  });
});
