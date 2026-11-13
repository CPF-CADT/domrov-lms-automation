import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AdminRoleGuard } from '../src/auth.guard';
import { PaymentService } from '../src/payment.service';
import { BakongProvider } from '../src/bakong.provider';
import { PaymentGateway } from '../src/payment.gateway';
import { CreditPackage, CreditReservation, IdempotencyRecord, Payment, WalletBalance, WalletTransaction } from '../src/entities';

const repos = () => ({ find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn((x: any) => x), remove: jest.fn(), createQueryBuilder: jest.fn() });

describe('Admin wallet functionality', () => {
  it('allows only admin roles', () => {
    const guard = new AdminRoleGuard();
    expect(() => guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ user: { role: 'student' } }) }) } as any)).toThrow();
    expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ user: { role: 'SuperAdmin' } }) }) } as any)).toBe(true);
  });

  it('is idempotent for repeated adjustment keys', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue({ userId: 'user-1', availableCredits: 10, reservedCredits: 0 }), save: jest.fn(async (v: any) => v), create: jest.fn((_t: any, v: any) => v) };
    const idempotency = repos();
    idempotency.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ response: { cached: true } });
    const service = await makeService({ idempotency, dataSource: { transaction: jest.fn((cb: any) => cb(manager)) } });
    const first = await service.adminAdjustWallet({ userId: 'user-1', amount: 5, reason: 'bonus', description: 'bonus', adminId: 'admin-1' }, 'same-key');
    expect(first.creditBalance).toBe(15);
    await expect(service.adminAdjustWallet({ userId: 'user-1', amount: 5, reason: 'bonus', description: 'bonus', adminId: 'admin-1' }, 'same-key')).resolves.toEqual({ cached: true });
    expect((service as any).dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects deductions below zero', async () => {
    const manager = { findOne: jest.fn().mockResolvedValue({ userId: 'user-1', availableCredits: 2, reservedCredits: 0 }), save: jest.fn(), create: jest.fn((_t: any, v: any) => v) };
    const service = await makeService({ idempotency: repos(), dataSource: { transaction: jest.fn((cb: any) => cb(manager)) } });
    await expect(service.adminAdjustWallet({ userId: 'user-1', amount: -3, reason: 'correction', description: 'correction', adminId: 'admin-1' }, 'key')).rejects.toThrow('Insufficient credit balance');
  });
});

async function makeService(overrides: any = {}) {
  const module = await Test.createTestingModule({ providers: [PaymentService,
    { provide: getRepositoryToken(WalletBalance), useValue: overrides.wallets ?? repos() },
    { provide: getRepositoryToken(CreditPackage), useValue: overrides.packages ?? repos() },
    { provide: getRepositoryToken(Payment), useValue: overrides.payments ?? repos() },
    { provide: getRepositoryToken(CreditReservation), useValue: overrides.reservations ?? repos() },
    { provide: getRepositoryToken(WalletTransaction), useValue: overrides.transactions ?? repos() },
    { provide: getRepositoryToken(IdempotencyRecord), useValue: overrides.idempotency ?? repos() },
    { provide: DataSource, useValue: overrides.dataSource ?? {} },
    { provide: BakongProvider, useValue: {} }, { provide: PaymentGateway, useValue: {} },
  ]}).compile();
  return module.get(PaymentService);
}
