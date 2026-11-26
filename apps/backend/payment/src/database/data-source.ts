import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CreditPackage, CreditReservation, IdempotencyRecord, Payment, WalletBalance, WalletTransaction } from '../entities';
import { InitialPaymentSchema1764000000000 } from './migrations/1764000000000-InitialPaymentSchema';
import { UseStringUserIds1764000002000 } from './migrations/1764000002000-UseStringUserIds';
import { UniquePaymentProviderReference1764000003000 } from './migrations/1764000003000-UniquePaymentProviderReference';
import { AddPaymentPurchaseSnapshots1764000004000 } from './migrations/1764000004000-AddPaymentPurchaseSnapshots';

export const paymentDataSourceOptions = { type: 'postgres' as const, url: process.env.DATABASE_URL, entities: [WalletBalance, CreditPackage, Payment, CreditReservation, IdempotencyRecord], migrations: [InitialPaymentSchema1764000000000, UseStringUserIds1764000002000, UniquePaymentProviderReference1764000003000, AddPaymentPurchaseSnapshots1764000004000], synchronize: false, logging: false };
export default new DataSource(paymentDataSourceOptions);
