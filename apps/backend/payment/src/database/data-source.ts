import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CreditPackage, CreditReservation, IdempotencyRecord, Payment, WalletBalance, WalletTransaction } from '../entities';
import { InitialPaymentSchema1764000000000 } from './migrations/1764000000000-InitialPaymentSchema';

export const paymentDataSourceOptions = { type: 'postgres' as const, url: process.env.DATABASE_URL, entities: [WalletBalance, CreditPackage, Payment, CreditReservation, WalletTransaction, IdempotencyRecord], migrations: [InitialPaymentSchema1764000000000], synchronize: false };
export default new DataSource(paymentDataSourceOptions);
