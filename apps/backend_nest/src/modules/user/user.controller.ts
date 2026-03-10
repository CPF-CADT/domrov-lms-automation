import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Get,
  Query,
  Post,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserId } from '../../common/decorators/user.decorator';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UserProfileResponseDto,
  UpdateProfileResponseDto,
  ChangePasswordResponseDto,
  UserListItemDto,
} from '../../libs/dtos/user/user.dto';
import { UserDetailDto } from '../../libs/dtos/admin/user-admin.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  // ==================== GET MY PROFILE ====================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my profile',
    description: 'Returns the authenticated user\'s profile information including personal details and account status.'
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          gender: 'M',
          dob: '2000-01-15',
          phoneNumber: '0123456789',
          profilePictureUrl: 'https://example.com/avatar.jpg',
          isVerified: true,
          isTwoFactorEnable: false,
          status: 'ACTIVE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z'
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    example: { statusCode: 404, message: 'User not found', error: 'Not Found' }
  })
  async getMyProfile(@UserId() userId: number): Promise<{ success: true; data: UserProfileResponseDto }> {
    const data = await this.userService.getMyProfile(userId);
    return { success: true, data };
  }

  @Get('details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get User Details',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          gender: 'M',
          email: 'john@example.com',
          phoneNumber: '+1234567890',
          profilePictureUrl: 'https://example.com/profile.jpg',
          isVerified: true,
          status: 'active',
          role: 'user',
          credits: 1000,
          joinDate: '2026-03-01T09:00:00Z',
          lastActivity: '2026-03-01T10:00:00Z',
          totalSpent: 500,
          purchasedPackages: [
            {
              packageId: 1,
              packageName: 'Premium Pack',
              credits: 500,
              bonusCredits: 50,
              price: 39.99,
              currency: 'USD',
              purchaseDate: '2026-03-01T09:00:00Z',
              paymentStatus: 'COMPLETED',
            },
          ],
          recentTransactions: [
            {
              id: 1,
              amount: 100,
              reason: 'Payment',
              balanceBefore: 900,
              balanceAfter: 1000,
              description: 'Premium Pack purchase',
              date: '2026-03-01T09:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUserDetails(@UserId() userId: number): Promise<{ success: true; data: UserDetailDto; }> {
    const user = await this.userService.getUserDetails(userId);
    return { success: true, data: user };
  }

  // ==================== UPDATE MY PROFILE ====================
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update my profile',
    description: 'Updates the authenticated user\'s profile. All fields are optional - only provided fields will be updated. Does not allow password change (use /change-password instead).'
  })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Profile fields to update',
    examples: {
      basicInfo: {
        summary: 'Update name and phone',
        value: {
          firstName: 'John',
          lastName: 'Smith',
          phoneNumber: '0987654321'
        }
      },
      fullUpdate: {
        summary: 'Full profile update',
        value: {
          firstName: 'John',
          lastName: 'Smith',
          gender: 'M',
          dob: '1995-06-15',
          phoneNumber: '0987654321',
          profilePictureUrl: 'https://example.com/new-avatar.jpg'
        }
      },
      avatarOnly: {
        summary: 'Update avatar only',
        value: {
          profilePictureUrl: 'https://example.com/new-avatar.jpg'
        }
      }
    }
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Profile updated successfully',
          user: {
            id: 1,
            firstName: 'John',
            lastName: 'Smith',
            email: 'john@example.com',
            gender: 'M',
            dob: '1995-06-15',
            phoneNumber: '0987654321',
            profilePictureUrl: 'https://example.com/new-avatar.jpg',
            isVerified: true,
            isTwoFactorEnable: false,
            status: 'ACTIVE',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-02-15T10:30:00Z'
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Validation error or phone number in use',
    examples: {
      phoneInUse: {
        summary: 'Phone number already taken',
        value: { statusCode: 400, message: 'Phone number already in use', error: 'Bad Request' }
      },
      invalidPhone: {
        summary: 'Invalid phone format',
        value: { statusCode: 400, message: 'Phone number must start with 0 and be 9-10 digits', error: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async updateMyProfile(
    @UserId() userId: number,
    @Body() dto: UpdateProfileDto
  ): Promise<{ success: true; data: UpdateProfileResponseDto }> {
    const data = await this.userService.updateMyProfile(userId, dto);
    return { success: true, data };
  }

  // ==================== CHANGE PASSWORD ====================
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Changes the authenticated user\'s password. Requires current password verification.'
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Password change data',
    examples: {
      changePassword: {
        summary: 'Change password',
        value: {
          currentPassword: 'OldP@ssw0rd',
          newPassword: 'NewP@ssw0rd123',
          confirmPassword: 'NewP@ssw0rd123'
        }
      }
    }
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    examples: {
      mismatch: {
        summary: 'Password confirmation mismatch',
        value: { statusCode: 400, message: 'New password and confirmation do not match', error: 'Bad Request' }
      },
      samePassword: {
        summary: 'Same as current password',
        value: { statusCode: 400, message: 'New password must be different from current password', error: 'Bad Request' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'Current password incorrect',
    example: { statusCode: 403, message: 'Current password is incorrect', error: 'Forbidden' }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async changePassword(
    @UserId() userId: number,
    @Body() dto: ChangePasswordDto
  ): Promise<{ success: true; data: ChangePasswordResponseDto }> {
    const data = await this.userService.changePassword(userId, dto);
    return { success: true, data };
  }

  // ==================== SEARCH USERS ====================
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search users by query',
    description: 'Search for users by various criteria. All parameters are optional and support partial matching.'
  })
  @ApiQuery({ name: 'id', required: false, type: Number, description: 'User ID', example: 1 })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Email (partial match)', example: 'john@' })
  @ApiQuery({ name: 'firstName', required: false, type: String, description: 'First name (partial match)', example: 'John' })
  @ApiQuery({ name: 'lastName', required: false, type: String, description: 'Last name (partial match)', example: 'Doe' })
  @ApiQuery({ name: 'phoneNumber', required: false, type: String, description: 'Phone number (partial match)', example: '012' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phoneNumber: '0123456789',
            profilePictureUrl: 'https://example.com/avatar.jpg',
            status: 'ACTIVE',
            isVerified: true
          }
        ]
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async searchUsers(@Query() query: Record<string, any>): Promise<{ success: true; data: UserListItemDto[] }> {
    const data = await this.userService.findByQuery(query);
    return { success: true, data };
  }
}
