import { createHmac } from 'crypto'
import { EntityManager, EntityTarget, FindOneOptions } from 'typeorm'
import { OtpPurpose, UserEmailOtp } from '../../src/entities/user-email-otp.entity'
import { User } from '../../src/entities/user.entity'
import { UserRefreshToken } from '../../src/entities/user-refresh-token.entity'

// Transaction/row-lock model for unit tests, not a live PostgreSQL integration.
// Lock options are required; callbacks serialize and thrown errors roll back.
export class OtpTestStore {
  record: UserEmailOtp | null = null
  private queue: Promise<unknown> = Promise.resolve()
  readonly save = jest.fn(async (target: EntityTarget<unknown>, value: unknown) => {
    if (target === UserEmailOtp) this.record = { ...(value as UserEmailOtp), id: 1 }
    else Object.assign(this.getUser()!, value)
    return value
  })
  readonly delete = jest.fn(async (target: EntityTarget<unknown>, criteria: { userId: number }) => {
    if (target !== UserRefreshToken) throw new Error('Unexpected delete')
    await this.deleteSessions(criteria)
    return { affected: 1 }
  })
  readonly findOne = jest.fn(async (target: EntityTarget<unknown>, options: FindOneOptions<UserEmailOtp>) => {
    if (options.lock?.mode !== 'pessimistic_write') throw new Error('Row lock required')
    if (target === User) return this.getUser() ? { ...this.getUser() } : null
    const where = options.where as { userId: number; purpose?: OtpPurpose }
    const row = this.record
    return row && row.userId === where.userId && (!where.purpose || row.purpose === where.purpose)
      ? { ...row } : null
  })
  readonly manager = {
    transaction: jest.fn(<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> => {
      const run = this.queue.then(async () => {
        const previous = this.record && { ...this.record }
        const previousUser = this.getUser() && { ...this.getUser() }
        try {
          return await callback({
            findOne: this.findOne,
            create: (_target: unknown, value: unknown) => value,
            save: this.save,
            delete: this.delete,
          } as unknown as EntityManager)
        } catch (error) {
          this.record = previous
          if (previousUser) Object.assign(this.getUser()!, previousUser)
          throw error
        }
      })
      this.queue = run.catch(() => undefined)
      return run
    }),
  }

  constructor(
    private readonly getUser: () => User | null,
    private readonly deleteSessions: (criteria: { userId: number }) => Promise<unknown> = async () => undefined,
  ) {}

  seed(secret: string, code: string, purpose = OtpPurpose.VERIFICATION) {
    const userId = this.getUser()!.id
    this.record = Object.assign(new UserEmailOtp(), {
      id: 1, userId, purpose, failedAttempts: 0,
      issuedAt: new Date(), expiresAt: new Date(Date.now() + 600_000),
      otpHash: createHmac('sha256', secret)
        .update(JSON.stringify(['domrov-otp-v1', userId, purpose, code])).digest('hex'),
    })
  }
}
