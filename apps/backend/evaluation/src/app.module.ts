import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './evaluation.entity';
import { UserAiKey } from './user-ai.entity';
import { EvaluationService } from './evaluation.service';
import { HttpController } from './http.controller';
import { MockRunnerService } from './mock-runner.service';
import { RabbitController } from './rabbit.controller';
import { UserAiController } from './user-ai.controller';
import { UserAiJwtGuard } from './user-ai.guard';

const rmq = (config: ConfigService, queue: string, exchange: string) => ({
  transport: Transport.RMQ as Transport.RMQ,
  options: { urls: [config.getOrThrow<string>('RABBITMQ_URL')], queue, exchange, exchangeType: 'topic', wildcards: true, persistent: true, queueOptions: { durable: true }, noAck: true, prefetchCount: 10 },
});

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ type: 'postgres', url: c.getOrThrow<string>('DATABASE_URL'), entities: [Evaluation, UserAiKey], synchronize: true }) }),
    TypeOrmModule.forFeature([Evaluation, UserAiKey]),
    ClientsModule.registerAsync([
      { name: 'EVALUATION_EVENTS', imports: [ConfigModule], inject: [ConfigService], useFactory: (c: ConfigService) => rmq(c, 'domrov.evaluation.publisher', c.get<string>('RABBITMQ_EVENTS_EXCHANGE', 'domrov.events')) },
      { name: 'PAYMENT_COMMANDS', imports: [ConfigModule], inject: [ConfigService], useFactory: (c: ConfigService) => rmq(c, 'domrov.evaluation.payment.client', c.get<string>('RABBITMQ_COMMANDS_EXCHANGE', 'domrov.commands')) },
    ]),
  ],
  controllers: [HttpController, RabbitController, UserAiController],
  providers: [EvaluationService, MockRunnerService, UserAiJwtGuard],
})
export class AppModule {}
