import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // --- 1. HTTP app for Swagger / REST ---
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    forbidUnknownValues: true,
  }));

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
      package: ['evaluation','submission'],
      protoPath: ['/app/shared/protos/evaluate.proto', '/app/shared/protos/submission.proto'],
      url: 'backend:50052',
      loader: { keepCase: true },
    }
  });

  await grpcApp.listen();
}

bootstrap();
