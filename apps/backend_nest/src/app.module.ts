import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SQLDatabaseModule } from './database/sql-database/sql-database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      expandVariables:true,
    }),
    SQLDatabaseModule,
    AuthModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService],
  exports:[AppService]
})
export class AppModule {}
