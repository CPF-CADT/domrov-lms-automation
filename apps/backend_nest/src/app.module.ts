import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SQLDatabaseModule } from './database/sql-database/sql-database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../libs/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      expandVariables:true,
    }),
    SQLDatabaseModule,
    TypeOrmModule.forFeature([User])
  ],
  controllers: [AppController],
  providers: [AppService],
  exports:[AppService]
})
export class AppModule {}
