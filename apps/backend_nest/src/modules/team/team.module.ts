import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../libs/entities/user.entity';
import { Team } from '../../../libs/entities/team.entity';
import { Enrollment } from '../../../libs/entities/enrollment.entity';
import { TeamMember } from '../../../libs/entities/user-team.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
      TypeOrmModule.forFeature([User, Team, Enrollment,TeamMember]),
      AuthModule
    ],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
