import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Subject } from 'rxjs'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AdminRoleGuard, SuperAdminRoleGuard } from '../src/admin/admin-role.guard'
import { AdminUserController } from '../src/admin/admin-user.controller'
import { AdminUserService } from '../src/admin/admin-user.service'
import { AuthController, UsersController } from '../src/auth/auth.controller'
import { AuthService } from '../src/auth/auth.service'
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard'
import { SystemRole, User, UserStatus } from '../src/entities/user.entity'
import { HealthController, MetricsController } from '../src/health/health.controller'
import { ReadinessService } from '../src/health/readiness.service'

describe('User service refactoring HTTP compatibility', () => {
  let app: INestApplication
  const auth = {
    register: jest.fn().mockResolvedValue({ userId: 7 }),
    updateProfile: jest.fn().mockResolvedValue({ message: 'Profile updated successfully', user: { id: 7 } }),
    logout: jest.fn(),
  }
  const user = { id: 7, status: UserStatus.ACTIVE, role: SystemRole.USER, created_at: new Date('2026-01-01'), updated_at: new Date('2026-02-01') }
  const builder = {
    andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[user], 1]),
  }
  const users = {
    createQueryBuilder: jest.fn(() => builder),
    findOne: jest.fn().mockResolvedValue(user), save: jest.fn(async (value) => value),
  }
  const probe = { where: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]) }
  const database = {
    isInitialized: true, entityMetadatas: [{ target: User }],
    getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => probe) })),
  }
  const status = new Subject<string>()
  let readiness: ReadinessService

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController, UsersController, AdminUserController, HealthController, MetricsController],
      providers: [
        AdminUserService, ReadinessService,
        { provide: AuthService, useValue: auth },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: DataSource, useValue: database },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
        context.switchToHttp().getRequest().user = { sub: 7, role: SystemRole.SUPER_ADMIN }
        return true
      } })
      .overrideGuard(AdminRoleGuard).useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminRoleGuard).useValue({ canActivate: () => true })
      .compile()
    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    readiness = module.get(ReadinessService)
    readiness.observeRabbitMq(status)
    await app.listen(0, '127.0.0.1')
  })

  afterAll(async () => { await app?.close() })
  beforeEach(() => { jest.clearAllMocks(); database.isInitialized = true; status.next('connected') })

  it('accepts frontend registration and profile date fields through validation', async () => {
    const profile = { firstName: 'Sok', lastName: 'Dara', dob: '2000-01-01T00:00:00.000Z', phoneNumber: '0123456789' }
    await request(app.getHttpServer()).post('/auth/sign-up')
      .send({ ...profile, email: 'sok@example.com', password: 'P@ssword1', confirmPassword: 'P@ssword1' })
      .expect(201, { success: true, data: { userId: 7 } })
    expect(auth.register).toHaveBeenCalledWith(expect.objectContaining(profile))
    await request(app.getHttpServer()).patch('/users/me').send(profile).expect(200)
    expect(auth.updateProfile).toHaveBeenCalledWith(7, expect.objectContaining(profile))
  })

  it('returns the legacy logout envelope even when the client sends no refresh cookie', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(200, {
      success: true, data: { status: 'success', message: 'Logged out from current device' },
    }).expect('Set-Cookie', /refresh_token=;/)
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('accepts the admin client default query and lowercase filters', async () => {
    const response = await request(app.getHttpServer()).get('/admin/users')
      .query({ page: 1, limit: 10, role: 'all', status: 'all', verified: 'all', sortBy: 'newest' }).expect(200)
    expect(response.body.data).toMatchObject({ total: 1, filtered: false, data: [{ id: 7, joinDate: '2026-01-01T00:00:00.000Z' }] })
    await request(app.getHttpServer()).get('/admin/users').query({ role: 'user', status: 'active', verified: 'true' }).expect(200)
    expect(builder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: SystemRole.USER })
    expect(builder.andWhere).toHaveBeenCalledWith('user.status = :status', { status: UserStatus.ACTIVE })
    expect(builder.andWhere).toHaveBeenCalledWith('user.isVerified = :verified', { verified: true })
  })

  it('accepts lowercase admin status with reason and returns legacy aliases', async () => {
    const response = await request(app.getHttpServer()).patch('/admin/users/7/status')
      .send({ status: 'inactive', reason: 'Requested' }).expect(200)
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ status: UserStatus.INACTIVE }))
    expect(response.body.data).toMatchObject({ id: 7, status: 'INACTIVE', reason: 'Requested', updatedAt: '2026-02-01T00:00:00.000Z' })
    await request(app.getHttpServer()).delete('/admin/users/7').expect(200, {
      success: true, data: { message: 'User deactivated successfully', deletedUserId: 7 },
    })
  })

  it('serves liveness and Prometheus text independently of dependency availability', async () => {
    database.isInitialized = false
    status.next('disconnected')
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok', service: 'user' })
    const response = await request(app.getHttpServer()).get('/metrics').expect(200).expect('Content-Type', /text\/plain/)
    expect(response.headers['content-type']).toContain('version=0.0.4')
    expect(response.text).toContain('auth_service_up 1\n')
  })

  it('returns readiness 503 on database, schema, broker, and shutdown failures', async () => {
    await request(app.getHttpServer()).get('/health/ready').expect(200)
    expect(probe.where).toHaveBeenCalledWith('1 = 0')
    database.isInitialized = false
    await request(app.getHttpServer()).get('/health/ready').expect(503)
    database.isInitialized = true
    probe.getRawMany.mockRejectedValueOnce(new Error('schema mismatch'))
    const failure = await request(app.getHttpServer()).get('/health/ready').expect(503)
    expect(failure.body.database).toBe('unavailable_or_schema_mismatch')
    expect(JSON.stringify(failure.body)).not.toContain('schema mismatch')
    status.next('disconnected')
    await request(app.getHttpServer()).get('/health/ready').expect(503)
    status.next('connected')
    await request(app.getHttpServer()).get('/health/ready').expect(200)
    readiness.beforeApplicationShutdown()
    await request(app.getHttpServer()).get('/health/ready').expect(503)
  })
})
