import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassService } from './class.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { UserId } from '../../common/decorators/user.decorator';
import {
  JoinClassByTokenDto,
  JoinClassDto,
} from '../../libs/dtos/class/join-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateClassDto } from '../../libs/dtos/class/create-class.dto';
import { UpdateClassDto } from '../../libs/dtos/class/update-class.dto';
import { TransferOwnershipDto } from '../../libs/dtos/class/transfer-ownership.dto';
import { AssignTADto } from '../../libs/dtos/class/assign-ta.dto';
import { InviteClassByEmailDto } from '../../libs/dtos/class/Invite-class.dto';

import { ClassResponseDto } from '../../libs/dtos/class/class-response.dto';
import { UserResponseDto } from '../../libs/dtos/user/user-response.dto';
import { JoinClassResponseDto } from '../../libs/dtos/class/join-class-response.dto';
import { MessageResponseDto } from '../../libs/dtos/common/message-response.dto';
import { LeaderboardItemDto } from '../../libs/dtos/class/leaderboard-response.dto';
import {
  ClassMemberGuard,
  ClassInstructorGuard,
  ClassOwnerGuard,
  GetClassContext,
} from '../../common/security';
import type { ClassContext } from '../../common/security';

@ApiTags('Class')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) { }

  // ==================== CLASS MANAGEMENT ====================

  @Post()
  @ApiOperation({
    summary: 'Create a new class',
    description: 'Creates a new class with the authenticated user as the owner and teacher.',
  })
  @ApiBody({ type: CreateClassDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Introduction to TypeScript',
          description: 'Learn the basics of TypeScript',
          coverImage: 'https://example.com/image.jpg',
          joinCode: 'ABC123',
          status: 'ACTIVE',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: ClassResponseDto }> {
    const data = await this.classService.createClass(createClassDto, userId);
    return { success: true, data };
  }

  @Get('my-classes')
  @ApiOperation({
    summary: 'Get all classes for the current user',
    description: 'Returns all classes where the user is enrolled as student, teacher, or owner.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            name: 'Introduction to TypeScript',
            description: 'Learn the basics of TypeScript',
            coverImage: 'https://example.com/image.jpg',
            joinCode: 'ABC123',
            status: 'ACTIVE',
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getMyClasses(
    @UserId() userId: number,
  ): Promise<{ success: true; data: ClassResponseDto[] }> {
    const data = await this.classService.getClassesForUser(userId);
    return { success: true, data };
  }

  @Patch(':classId')
  @UseGuards(ClassInstructorGuard)
  @ApiOperation({
    summary: 'Update class info',
    description: 'Updates class name, description, or cover image. Only teachers can update.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class to update' })
  @ApiBody({ type: UpdateClassDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'Introduction to TypeScript',
          description: 'Learn the basics of TypeScript',
          coverImage: 'https://example.com/image.jpg',
          joinCode: 'ABC123',
          status: 'ACTIVE',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - User is not a teacher of this class' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async updateClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: UpdateClassDto,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: ClassResponseDto }> {
    const data = await this.classService.updateClass(dto, context);
    return { success: true, data };
  }

  @Delete(':classId')
  @UseGuards(ClassOwnerGuard)
  @ApiOperation({
    summary: 'Delete a class',
    description: 'Permanently deletes a class. Only the class owner can delete.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class to delete' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Class deleted successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - Only the class owner can delete' })
  @ApiBadRequestResponse({ description: 'Cannot delete due to existing dependencies (assessments, submissions, etc.)' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async deleteClass(
    @Param('classId', ParseIntPipe) classId: number,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.classService.deleteClass(context);
    return { success: true, data };
  }

  @Post(':classId/complete')
  @UseGuards(ClassInstructorGuard)
  @ApiOperation({
    summary: 'Mark class as completed',
    description: 'Changes class status to END. Only teachers can mark as complete.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class to mark complete' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Class marked as completed',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - User is not a teacher of this class' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async markComplete(
    @Param('classId', ParseIntPipe) classId: number,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.classService.markClassComplete(context);
    return { success: true, data };
  }

  // ==================== JOIN CLASS ====================

  @Post('join/code')
  @ApiOperation({
    summary: 'Join a class using a join code',
    description: 'Students can join a class by entering the 6-character join code.',
  })
  @ApiBody({ type: JoinClassDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          classId: 1,
          className: 'Introduction to TypeScript',
          joinedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Class not found with this code' })
  @ApiConflictResponse({ description: 'User is already enrolled in this class' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async joinClassWithCode(
    @Body() joinClassDto: JoinClassDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: JoinClassResponseDto }> {
    const data = await this.classService.joinClassWithCode(joinClassDto.joinCode, userId);
    return { success: true, data };
  }

  @Get('join/link')
  @ApiOperation({
    summary: 'Join a class using an invite link token',
    description: 'Students can join a class by clicking an invite link with a JWT token.',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT invite token from the invite link',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          classId: 1,
          className: 'Introduction to TypeScript',
          joinedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired invite link' })
  @ApiConflictResponse({ description: 'User is already enrolled in this class' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - You are not invited to this class' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  async joinByLink(
    @Query() dto: JoinClassByTokenDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: JoinClassResponseDto }> {
    const data = await this.classService.joinClassByInviteToken(dto.token, userId);
    return { success: true, data };
  }

  // ==================== STUDENTS MANAGEMENT ====================

  @Get(':classId/students')
  @UseGuards(ClassMemberGuard)
  @ApiOperation({
    summary: 'Get all students in a class',
    description: 'Returns a list of all enrolled students in the class. Accessible by class members.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 5,
            name: 'John Doe',
            email: 'john@example.com',
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - User is not a member of this class' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getStudentsInClass(
    @Param('classId', ParseIntPipe) classId: number,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: UserResponseDto[] }> {
    const data = await this.classService.getStudentsInClass(context);
    return { success: true, data };
  }

  @Delete(':classId/student/:studentId')
  @UseGuards(ClassInstructorGuard)
  @ApiOperation({
    summary: 'Remove a student from a class',
    description: 'Removes a student from the class enrollment. Only teachers can remove students.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiParam({ name: 'studentId', type: Number, example: 5, description: 'The ID of the student to remove' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Student removed successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - Cannot remove another teacher or yourself' })
  @ApiNotFoundResponse({ description: 'Student not found in this class' })
  @ApiBadRequestResponse({ description: 'You cannot remove yourself' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async removeStudent(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.classService.removeStudent(studentId, context);
    return { success: true, data };
  }

  // ==================== INVITE ====================

  @Post(':classId/invite')
  @UseGuards(ClassInstructorGuard)
  @ApiOperation({
    summary: 'Invite a user by email',
    description: 'Sends an email invitation to join the class. The user must be registered. Only teachers can invite.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiBody({ type: InviteClassByEmailDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Invitation email sent successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - User is not a teacher of this class' })
  @ApiNotFoundResponse({ description: 'User with this email not found. They must register first.' })
  @ApiConflictResponse({ description: 'User is already enrolled in this class' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async inviteByEmail(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: InviteClassByEmailDto,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.classService.inviteByEmail(dto.email, context);
    return { success: true, data };
  }

  // ==================== TEACHER MANAGEMENT ====================

  @Post(':classId/transfer-ownership')
  @UseGuards(ClassOwnerGuard)
  @ApiOperation({
    summary: 'Transfer class ownership',
    description: 'Transfers ownership to another enrolled user. The current owner becomes a TA.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiBody({ type: TransferOwnershipDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'Ownership transferred successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - Only the current owner can transfer ownership' })
  @ApiNotFoundResponse({ description: 'Class not found or new owner not enrolled' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async transferOwnership(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: TransferOwnershipDto,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.classService.transferOwnership(dto.newOwnerId, context);
    return { success: true, data };
  }

  @Post(':classId/assign-ta')
  @UseGuards(ClassInstructorGuard)
  @ApiOperation({
    summary: 'Assign a Teaching Assistant',
    description: 'Assigns or promotes a user to Teaching Assistant role. Only teachers can assign TAs.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiBody({ type: AssignTADto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'TA assigned successfully',
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - User is not a teacher of this class' })
  @ApiNotFoundResponse({ description: 'Class or user not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async assignTA(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: AssignTADto,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: MessageResponseDto }> {
    const data = await this.classService.assignTA(dto.taId, context);
    return { success: true, data };
  }

  // ==================== LEADERBOARD ====================

  @Get(':classId/leaderboard')
  @UseGuards(ClassInstructorGuard)
  @ApiOperation({
    summary: 'Get class leaderboard',
    description: 'Returns students ranked by their total submission scores. Only teachers can view.',
  })
  @ApiParam({ name: 'classId', type: Number, example: 1, description: 'The ID of the class' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            studentId: 5,
            studentName: 'John Doe',
            totalScore: 95,
            rank: 1,
          },
        ],
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Forbidden - User is not a teacher of this class' })
  @ApiNotFoundResponse({ description: 'Class not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getLeaderboard(
    @Param('classId', ParseIntPipe) classId: number,
    @GetClassContext() context: ClassContext,
  ): Promise<{ success: true; data: LeaderboardItemDto[] }> {
    const data = await this.classService.getLeaderboard(context);
    return { success: true, data };
  }
}