import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { of } from 'rxjs'
import { ReadinessService } from '../src/health/readiness.service'
import { bootstrap } from '../src/main'

// Exercise lifecycle wiring without opening a database or broker connection.
jest.mock('../src/app.module', () => ({ AppModule: class AppModule {} }))

describe('Independent application lifecycle', () => {
  afterEach(() => jest.restoreAllMocks())

  const createApp = () => ({
    get: jest.fn((token) => token === ConfigService
      ? new ConfigService({ RABBITMQ_URL: 'amqp://localhost', PORT: 3001 })
      : { observeRabbitMq: jest.fn() }),
    connectMicroservice: jest.fn(() => ({ status: of('connected') })),
    enableShutdownHooks: jest.fn(), use: jest.fn(), enableCors: jest.fn(), useGlobalPipes: jest.fn(),
    startAllMicroservices: jest.fn().mockResolvedValue(undefined),
    listen: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined),
  })

  it('starts RabbitMQ before HTTP and enables Nest shutdown hooks', async () => {
    const app = createApp()
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as unknown as Awaited<ReturnType<typeof NestFactory.create>>)
    await bootstrap()
    expect(app.enableShutdownHooks).toHaveBeenCalled()
    expect(app.get).toHaveBeenCalledWith(ReadinessService)
    expect(app.startAllMicroservices.mock.invocationCallOrder[0]).toBeLessThan(app.listen.mock.invocationCallOrder[0])
    expect(app.listen).toHaveBeenCalledWith(3001)
  })

  it('closes allocated resources when startup fails', async () => {
    const app = createApp()
    app.listen.mockRejectedValue(new Error('port unavailable'))
    jest.spyOn(NestFactory, 'create').mockResolvedValue(app as unknown as Awaited<ReturnType<typeof NestFactory.create>>)
    await expect(bootstrap()).rejects.toThrow('port unavailable')
    expect(app.close).toHaveBeenCalledTimes(1)
  })
})
