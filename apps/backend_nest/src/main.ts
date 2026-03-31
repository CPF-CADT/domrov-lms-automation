import "./common/logging/instrument";

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { PerformanceSentryInterceptor } from './common/interceptor/PerformanceLoggingInterceptor';
import * as Sentry from '@sentry/node';
import session from 'express-session';
import helmet from 'helmet';


async function bootstrap() {
  // --- 1. HTTP app for Swagger / REST ---
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalInterceptors(new PerformanceSentryInterceptor());

  // CORS configuration with proper origin handling for credentials
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://domrov.app').split(',');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(helmet());

  app.use(
    session({
      secret: process.env.DOMROV_SECRET_KEY || 'default_secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: true, httpOnly: true, sameSite: 'strict' }
    }),
  );
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    forbidUnknownValues: true,
  }));
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0, // 0 to 1, 1 = capture all transactions
  });


  const config = new DocumentBuilder()
    .setTitle('Domrov LMS-Automation')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true, withCredentials: true },
  });

  await app.listen(3000);

  // --- 2. gRPC microservice ---
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: ['evaluation', 'submission'],
        protoPath: [join(__dirname, './libs/protos/evaluate.proto'), join(__dirname, './libs/protos/submission.proto')],
        url: '0.0.0.0:50052',
        loader: { keepCase: true },
      }
    });

  await grpcApp.listen();
}

bootstrap();

