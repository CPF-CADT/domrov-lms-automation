import { DataSource } from 'typeorm'
import { authDataSourceOptions } from '../src/database/data-source'
import { HardenEmailOtps1763000004000 } from '../src/database/migrations/1763000004000-HardenEmailOtps'
import { OtpPurpose, UserEmailOtp } from '../src/entities/user-email-otp.entity'
import { User } from '../src/entities/user.entity'

class OfflinePostgresDataSource extends DataSource {
  async prepareMetadata() { await this.buildMetadatas() }
}

describe('OTP PostgreSQL mapping and migration (offline; no database connection)', () => {
  let source: OfflinePostgresDataSource
  beforeAll(async () => {
    source = new OfflinePostgresDataSource({
      ...authDataSourceOptions, url: 'postgres://test:test@localhost:5432/test',
    })
    await source.prepareMetadata()
  })
  afterEach(() => jest.restoreAllMocks())

  it('maps digest, persisted attempts and issuance timestamp without plaintext', () => {
    const metadata = source.getMetadata(UserEmailOtp)
    const hash = metadata.findColumnWithPropertyName('otpHash')!
    expect(hash.databaseName).toBe('otp_hash')
    expect(hash.length).toBe('64')
    expect(hash.isNullable).toBe(false)
    expect(metadata.findColumnWithPropertyName('otp')).toBeUndefined()
    expect(metadata.findColumnWithPropertyName('failedAttempts')!.databaseName).toBe('failed_attempts')
    expect(metadata.findColumnWithPropertyName('failedAttempts')!.default).toBe(0)
    expect(metadata.findColumnWithPropertyName('issuedAt')!.databaseName).toBe('issued_at')
  })

  it('generates PostgreSQL FOR UPDATE locks on the user and purpose-scoped OTP', () => {
    const userSql = source.getRepository(User).createQueryBuilder('user')
      .where({ id: 7 }).setLock('pessimistic_write').getSql()
    const [otpSql, params] = source.getRepository(UserEmailOtp).createQueryBuilder('otp')
      .where({ userId: 7, purpose: OtpPurpose.VERIFICATION })
      .setLock('pessimistic_write').getQueryAndParameters()
    expect(userSql.endsWith('FOR UPDATE')).toBe(true)
    expect(otpSql.endsWith('FOR UPDATE')).toBe(true)
    expect(otpSql).toContain('"otp"."user_id" = $1')
    expect(otpSql).toContain('"otp"."purpose" = $2')
    expect(params).toEqual([7, OtpPurpose.VERIFICATION])
    expect(source.isInitialized).toBe(false)
  })

  it('registers the new development cutover after refresh hashing', () => {
    expect(authDataSourceOptions.migrations.at(-1)).toBe(HardenEmailOtps1763000004000)
    expect(authDataSourceOptions.migrationsRun).toBe(false)
    expect(authDataSourceOptions.synchronize).toBe(false)
  })

  it('locks and invalidates existing codes before adding required columns and dropping plaintext', async () => {
    const query = jest.fn().mockResolvedValue([])
    const runner = source.createQueryRunner()
    jest.spyOn(runner, 'query').mockImplementation(query)
    await new HardenEmailOtps1763000004000().up(runner)
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'LOCK TABLE "user_email_otp" IN ACCESS EXCLUSIVE MODE',
      'DELETE FROM "user_email_otp"',
      'ALTER TABLE "user_email_otp" ADD "otp_hash" character varying(64) NOT NULL',
      'ALTER TABLE "user_email_otp" ADD "failed_attempts" integer NOT NULL DEFAULT 0',
      'ALTER TABLE "user_email_otp" ADD "issued_at" TIMESTAMP NOT NULL',
      'ALTER TABLE "user_email_otp" ADD CONSTRAINT "CK_user_email_otp_hash" CHECK ("otp_hash" ~ \'^[a-f0-9]{64}$\')',
      'ALTER TABLE "user_email_otp" ADD CONSTRAINT "CK_user_email_otp_attempts" CHECK ("failed_attempts" BETWEEN 0 AND 5)',
      'ALTER TABLE "user_email_otp" DROP COLUMN "otp"',
    ])
    expect(source.isInitialized).toBe(false)
  })

  it('invalidates records on rollback because HMACs cannot recover codes', async () => {
    const runner = source.createQueryRunner()
    const query = jest.spyOn(runner, 'query').mockResolvedValue([])
    await new HardenEmailOtps1763000004000().down(runner)
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'LOCK TABLE "user_email_otp" IN ACCESS EXCLUSIVE MODE',
      'DELETE FROM "user_email_otp"',
      'ALTER TABLE "user_email_otp" DROP CONSTRAINT "CK_user_email_otp_hash"',
      'ALTER TABLE "user_email_otp" DROP CONSTRAINT "CK_user_email_otp_attempts"',
      'ALTER TABLE "user_email_otp" DROP COLUMN "otp_hash", DROP COLUMN "failed_attempts", DROP COLUMN "issued_at"',
      'ALTER TABLE "user_email_otp" ADD "otp" character varying(6) NOT NULL',
    ])
    expect(source.isInitialized).toBe(false)
  })
})
