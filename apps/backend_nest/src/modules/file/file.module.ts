import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { R2Service } from '../../services/r2.service';
import { Resource } from '../../libs/entities/resource/resource.entity';
import { CloudinaryService } from '../../services/cloudinary.service';
import { AssessmentModule } from '../assessment/assessment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resource]),
    AssessmentModule
  ],
  controllers: [FileController],
  providers: [FileService, R2Service,CloudinaryService],
  exports: [FileService],
})
export class FileModule { }