import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassStatus } from '../../enums/Status';
import { UserRole } from '../../enums/Role';
import { ClassOwnerDto } from './class-owner.dto';

export class ClassResponseDto {
    @ApiProperty({ example: 1, description: 'The unique identifier of the class' })
    id: number;

    @ApiProperty({ example: 'Advanced Web Development', description: 'The name of the class' })
    name: string;

    @ApiPropertyOptional({ example: 'Learning about NestJS and React', description: 'Description of the class' })
    description?: string;

    @ApiPropertyOptional({ example: 'https://example.com/images/class-cover.jpg', description: 'Cover image URL for the class' })
    coverImageUrl?: string;

    @ApiProperty({ example: 'active', enum: ClassStatus, description: 'The status of the class' })
    status: ClassStatus;

    @ApiProperty({ type: () => ClassOwnerDto, description: 'The owner of the class' })
    owner: ClassOwnerDto;

    @ApiPropertyOptional({ example: 'teacher', enum: UserRole, description: 'The role of the current user in this class' })
    role?: UserRole;

    @ApiPropertyOptional({ example: 'A1B2C3', description: 'The join code for the class (only visible to teachers)' })
    joinCode?: string;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'The creation timestamp of the class' })
    createdAt: Date;

    static fromEntity(cls: any, role?: UserRole): ClassResponseDto {
        return {
            id: cls.id,
            name: cls.name,
            description: cls.description,
            coverImageUrl: cls.coverImageUrl,
            status: cls.status,
            owner: {
                id: cls.owner?.id,
                firstName: cls.owner?.firstName,
                lastName: cls.owner?.lastName,
                email: cls.owner?.email,
            },
            role,
            joinCode: role === UserRole.Teacher ? cls.joinCode : undefined,
            createdAt: cls.created_at,
        };
    }
}
