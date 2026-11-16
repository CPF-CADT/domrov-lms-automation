import { DataSource, MoreThan } from 'typeorm'
import { authDataSourceOptions } from '../src/database/data-source'
import { HashRefreshTokens1763000003000 } from '../src/database/migrations/1763000003000-HashRefreshTokens'
import { UserRefreshToken } from '../src/entities/user-refresh-token.entity'

class OfflinePostgresDataSource extends DataSource {
  async prepareMetadata() {
    await this.buildMetadatas()
  }
}

describe('Refresh token PostgreSQL persistence (offline SQL checks)', () => {
  let source: OfflinePostgresDataSource

  beforeAll(async () => {
    source = new OfflinePostgresDataSource({
      ...authDataSourceOptions,
      // No connection is initialized; no real credentials or database are used.
      url: 'postgres://test:test@localhost:5432/test',
    })
    await source.prepareMetadata()
  })

  afterEach(() => jest.restoreAllMocks())

  it('maps the unique 64-character hash column without a plaintext token column', () => {
    const metadata = source.getMetadata(UserRefreshToken)
    const column = metadata.findColumnWithPropertyName('tokenHash')!
    expect(column.databaseName).toBe('token_hash')
    expect(column.length).toBe('64')
    expect(
      metadata.uniques.some((unique) => unique.columns.includes(column)),
    ).toBe(true)
    expect(metadata.findColumnWithPropertyName('refreshToken')).toBeUndefined()
  })

  it('generates one conditional PostgreSQL UPDATE with hash, owner, id, and expiry predicates', () => {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 3600000)
    const [sql, parameters] = source
      .getRepository(UserRefreshToken)
      .createQueryBuilder()
      .update(UserRefreshToken)
      .set({ tokenHash: 'b'.repeat(64), expiresAt })
      .where({
        id: 1,
        userId: 7,
        tokenHash: 'a'.repeat(64),
        expiresAt: MoreThan(now),
      })
      .getQueryAndParameters()
    expect(sql).toBe(
      'UPDATE "user_refresh_token" SET "token_hash" = $1, "expiresAt" = $2 ' +
        'WHERE ("id" = $3 AND "user_id" = $4 AND "token_hash" = $5 AND "expiresAt" > $6)',
    )
    expect(parameters).toEqual([
      'b'.repeat(64),
      expiresAt,
      1,
      7,
      'a'.repeat(64),
      now,
    ])
    expect(sql.includes('refreshToken')).toBe(false)
  })

  it('registers the new migration after existing migrations', () => {
    expect(authDataSourceOptions.migrations[3]).toBe(
      HashRefreshTokens1763000003000,
    )
  })

  it('invalidates old sessions before dropping plaintext (mocked queries only)', async () => {
    const runner = source.createQueryRunner()
    const query = jest.spyOn(runner, 'query').mockResolvedValue([])
    await new HashRefreshTokens1763000003000().up(runner)
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'LOCK TABLE "user_refresh_token" IN ACCESS EXCLUSIVE MODE',
      'DELETE FROM "user_refresh_token"',
      'ALTER TABLE "user_refresh_token" ADD "token_hash" character varying(64) NOT NULL',
      'ALTER TABLE "user_refresh_token" ADD CONSTRAINT "UQ_user_refresh_token_hash" UNIQUE ("token_hash")',
      'ALTER TABLE "user_refresh_token" DROP COLUMN "refreshToken"',
    ])
    expect(source.isInitialized).toBe(false)
  })

  it('invalidates sessions on rollback instead of recovering plaintext (mocked queries only)', async () => {
    const runner = source.createQueryRunner()
    const query = jest.spyOn(runner, 'query').mockResolvedValue([])
    await new HashRefreshTokens1763000003000().down(runner)
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      'LOCK TABLE "user_refresh_token" IN ACCESS EXCLUSIVE MODE',
      'DELETE FROM "user_refresh_token"',
      'ALTER TABLE "user_refresh_token" DROP COLUMN "token_hash"',
      'ALTER TABLE "user_refresh_token" ADD "refreshToken" character varying(2048) NOT NULL',
    ])
    expect(source.isInitialized).toBe(false)
  })
})
