import { IsString, IsEmail, IsIn, Length, IsOptional, IsNumber, Matches, IsDate, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPasswordConfirmed } from '../../common/decorators/IsPasswordConfirmed';
export class ChangePasswordDTO {
  @ApiProperty({ example: 'NewP@ssw0rd123', description: 'New password (6-20 characters)' })
  @IsString()
  @Length(6, 20)
  newPassword: string;

  @ApiProperty({ example: 'NewP@ssw0rd123', description: 'Confirm new password, must match newPassword' })
  @IsString()
  @Length(6, 20)
  confirmPassword: string;
}
