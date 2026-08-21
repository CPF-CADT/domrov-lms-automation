import { Module } from '@nestjs/common';
import { UserAiService } from './user-ai.service';
import { UserAiController } from './user-ai.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { Typeoem}
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';
import { AIUsageLogService } from './ai-usage-log.service';
import { AIUsageLog } from '../../libs/entities/ai/ai-usage-log.entity';
import { User } from '../../libs/entities/user/user.entity';
import { AIConnectionTestService } from '../../services/ai-connection-test.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAIKey,
      AIUsageLog,
      User,
    ]),
  ],
  controllers: [UserAiController],
  providers: [UserAiService, AIUsageLogService,AIConnectionTestService],
  exports: [AIUsageLogService],
})
export class UserAiModule { }
