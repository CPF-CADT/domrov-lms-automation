import { IsString, IsEmail, IsIn, Length, IsOptional, IsNumber, Matches, IsDate, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPasswordConfirmed } from '../../src/common/decorators/IsPasswordConfirmed';
export class ChangePasswordDTO {
  @IsString()
  @Length(6, 20)
  newPassword: string;

  @IsString()
  @Length(6, 20)
  confirmPassword: string;
}
