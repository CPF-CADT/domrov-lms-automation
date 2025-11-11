import { 
  Controller, 
  Patch, 
  Param, 
  Body, 
  NotFoundException, 
  UseGuards,
  Get,
  Query
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDTO } from '../../../libs/dtos/update.user.dto';
import { User } from '../../../libs/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID to update',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        message: 'User updated successfully',
        affectedRows: 1,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: { statusCode: 404, message: 'User not found', error: 'Not Found' },
    },
  })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDTO) {
    const result = await this.userService.update(id, updateUserDto);
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  // @UseGuards(JwtAuthGuard)  open after development
  @Get('find')
  @ApiOperation({ summary: 'Find user(s) by query parameters ' })
  @ApiQuery({ name: 'id', required: false, type: String, example: '1' })
  @ApiQuery({ name: 'email', required: false, type: String, example: 'panha@gmail.com' })
  @ApiQuery({ name: 'firstName', required: false, type: String, example: 'Panha' })
  @ApiQuery({ name: 'lastName', required: false, type: String, example: 'Chan' })
  @ApiQuery({ name: 'phoneNumber', required: false, type: String, example: '0123456789' })
  @ApiResponse({
    status: 200,
    description: 'User(s) found successfully',
    schema: {
      example: [
        {
          id: 1,
          firstName: 'Panha',
          lastName: 'Chan',
          email: 'panha@gmail.com',
          phoneNumber: '0123456789',
          profilePictureUrl: 'https://example.com/panha.jpg',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized – JWT token required',
    schema: { example: { statusCode: 401, message: 'Unauthorized' } },
  })
  async findUsers(@Query() query: Record<string, any>): Promise<User[] | User> {
    return this.userService.findByQuery(query);
  }
}
