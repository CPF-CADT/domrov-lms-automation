// user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty({ example: 1, description: 'User unique identifier' })
    id: number;

    @ApiProperty({ example: 'Sok', description: 'First name of the user' })
    firstName: string;

    @ApiProperty({ example: 'Dara', description: 'Last name of the user' })
    lastName: string;

    @ApiProperty({ example: 'sokdara@gmail.com', description: 'Email address of the user' })
    email: string;

    @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', description: 'Profile picture URL', nullable: true })
    profilePictureUrl: string | null;

    constructor(partial: Partial<UserResponseDto>) {
        Object.assign(this, partial);
    }

    // Static method to map a raw user entity to the DTO
    static toDto(user: any): UserResponseDto {
        return new UserResponseDto({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profilePictureUrl: user.profilePictureUrl,
        });
    }
    static fromEntity(user: any): UserResponseDto {
        const { id, firstName, lastName, email, profilePictureUrl } = user;
        return {
            id: id,
            firstName: firstName,
            lastName: lastName,
            email: email,
            profilePictureUrl: profilePictureUrl,
        };
    }

}