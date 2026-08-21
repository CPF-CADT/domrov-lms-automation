import { ApiProperty } from '@nestjs/swagger';

export class ClassOwnerDto {
    @ApiProperty({ example: 1, description: 'The unique identifier of the class owner' })
    id: number;

    @ApiProperty({ example: 'John', description: 'First name of the class owner' })
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'Last name of the class owner' })
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com', description: 'Email address of the class owner' })
    email: string;
}
