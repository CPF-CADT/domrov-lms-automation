import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../libs/entities/user/user.entity';
import { Team } from '../../../libs/entities/classroom/team.entity';
import { Enrollment } from '../../../libs/entities/classroom/enrollment.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../../config/mailer.config';
import { TeamMember } from '../../../libs/entities/classroom/user-team.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team, Enrollment, TeamMember]),
    AuthModule,
    JwtModule,
    ConfigModule,
    MailModule
  ],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule { }
