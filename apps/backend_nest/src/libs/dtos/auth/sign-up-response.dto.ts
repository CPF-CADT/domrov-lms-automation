import { ApiProperty } from '@nestjs/swagger';

export class SignUpResponseDto {
    @ApiProperty({ example: 1, description: 'User unique identifier' })
    userId: number;

    @ApiProperty({ example: 'Sok', description: 'First name of the user' })
    firstName: string;

    @ApiProperty({ example: 'Dara', description: 'Last name of the user' })
    lastName: string;

    @ApiProperty({ example: 'sokdara@gmail.com', description: 'Email address of the user' })
    email: string;
}
