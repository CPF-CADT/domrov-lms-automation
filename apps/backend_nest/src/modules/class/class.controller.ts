import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClassService } from './class.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from '../../common/decorators/user.decorator';
import { JoinClassByTokenDto, JoinClassDto } from '../../../libs/dtos/class/join-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateClassDto } from '../../../libs/dtos/class/create-class.dto';
import { TransferOwnershipDto } from '../../../libs/dtos/class/transfer-ownership.dto';
import { AssignTADto } from '../../../libs/dtos/class/assign-ta.dto';
import { InviteClassByEmailDto } from '../../../libs/dtos/class/Invite-class.dto';

@ApiTags('Class')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({
    status: 201,
    description: 'The class has been successfully created.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @UserId() userId: number,
  ) {
    return this.classService.createClass(createClassDto, userId);
  }

  @Post('join/code')
  @ApiOperation({ summary: 'Join a class using a join code' })
  @ApiResponse({ status: 200, description: 'Successfully joined class' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({ status: 409, description: 'User already enrolled' })
  async joinClassWithCode(
    @Body() joinClassDto: JoinClassDto,
    @UserId() userId: number,
  ) {
    return this.classService.joinClassWithCode(joinClassDto.joinCode, userId);
  }

  @Get('my-classes')
  @ApiOperation({ summary: 'Get all classes for the current user' })
  @ApiResponse({
    status: 200,
    description: "A list of the user's classes and their role in each",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyClasses(@UserId() userId: number) {
    return this.classService.getClassesForUser(userId);
  }

  @Get(':classId/students')
  @ApiOperation({ summary: 'Get all students in a class (Teacher only)' })
  @ApiParam({ name: 'classId', description: 'The class ID' })
  @ApiResponse({
    status: 200,
    description: 'A list of students enrolled in the class',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User is not a teacher of this class.',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getStudentsInClass(
    @Param('classId', ParseIntPipe) classId: number,
    @UserId() teacherId: number,
  ) {
    return this.classService.getStudentsInClass(classId, teacherId);
  }

  @Post('transfer-ownership')
  @ApiOperation({ summary: 'Transfer ownership of a class to another enrolled user' })
  @ApiResponse({ status: 200, description: 'Ownership transferred successfully' })
  async transferOwnership(@Body() dto: TransferOwnershipDto, @UserId() userId: number) {
    return this.classService.transferOwnership(dto, userId);
  }

  @Post('assign-ta')
  @ApiOperation({ summary: 'Assign a teaching assistant (Teacher only)' })
  async assignTA(@Body() dto: AssignTADto, @UserId() teacherId: number) {
    return this.classService.assignTA(dto, teacherId);
  }

  @Post(':classId/complete')
  @ApiOperation({ summary: 'Mark class as completed (Teacher only)' })
  async markComplete(
    @Param('classId') classId: number,
    @UserId() teacherId: number,
  ) {
    return this.classService.markClassComplete(classId, teacherId);
  }

  @Delete(':classId/student/:studentId')
  @ApiOperation({ summary: 'Remove a student from a class (Teacher only)' })
  @ApiParam({ name: 'classId', description: 'The class ID' })
  @ApiParam({ name: 'studentId', description: 'The student ID to remove' })
  @ApiResponse({ status: 200, description: 'Student removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found in class' })
  async removeStudent(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @UserId() teacherId: number,
  ) {
    return this.classService.removeStudent(classId, studentId, teacherId);
  }

  @Post(':classId/invite')
  @ApiOperation({ summary: 'Invite a student by email to join a class' })
  @ApiParam({ name: 'classId', type: Number })
  async inviteByEmail(
    @Param('classId') classId: number,
    @Body() dto: InviteClassByEmailDto,
    @UserId() teacherId: number,
  ) {
    return this.classService.inviteByEmail(classId, dto.email, teacherId);
  }

  @Get('join/link')
  @ApiOperation({ summary: 'Join a class using an invite token' })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Invite token',
  })
  async joinByLink(
    @Query() dto: JoinClassByTokenDto,
    @UserId() userId: number,
  ) {
    return this.classService.joinClassByInviteToken(dto.token, userId);
  }


}

