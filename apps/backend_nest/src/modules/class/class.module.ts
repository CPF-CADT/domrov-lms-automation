import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from '../../../libs/entities/classroom/class.entity';
import { User } from '../../../libs/entities/user/user.entity';
import { Enrollment } from '../../../libs/entities/classroom/enrollment.entity';
import { Assessment } from '../../../libs/entities/assessment/assessment.entity';
import { Submission } from '../../../libs/entities/assessment/submission.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../../config/mailer.config';
import { Evaluation } from '../../../libs/entities/assessment/evaluation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Class, Enrollment, Assessment, Submission, Evaluation]),
    AuthModule,
    JwtModule,
    ConfigModule,
    MailModule
  ],
  controllers: [ClassController],
  providers: [ClassService],
})
export class ClassModule { }
