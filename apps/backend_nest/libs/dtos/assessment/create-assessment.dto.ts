import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEnum,
  ValidateNested,
  ArrayNotEmpty,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionType } from '../../enums/Assessment';
import { CreateRubricDTO } from './create-rubric.dto';


// Custom validator: dueDate > startDate
@ValidatorConstraint({ name: 'IsAfterStartDate', async: false })
export class IsAfterStartDate
  implements ValidatorConstraintInterface
{
  validate(dueDate: Date, args: ValidationArguments) {
    const obj = args.object as any;
    return dueDate > obj.startDate;
  }

  defaultMessage() {
    return 'dueDate must be after startDate';
  }
}

export class CreateAssessmentDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  instruction: string;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  @ApiPropertyOptional()
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  @Type(() => Date)
  @Validate(IsAfterStartDate)
  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  maxScore: number;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  submissionType: SubmissionType;

  @ApiProperty()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowLate: boolean;

  @ApiProperty()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowTeamSubmition: boolean;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  classId: number;

  @ApiProperty({ type: [CreateRubricDTO] })
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed.map((item) => Object.assign(new CreateRubricDTO(), item));
      } catch {
        return [];
      }
    }
    return value;
  })
  @Type(() => CreateRubricDTO)
  rubrics: CreateRubricDTO[];
}
