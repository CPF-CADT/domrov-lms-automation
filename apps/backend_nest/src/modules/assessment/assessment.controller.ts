import {
  Body, Controller, Post, Get, Param, UseGuards, ParseIntPipe,
  Delete,
  Patch,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiBody
} from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateAssessmentDTO } from '../../libs/dtos/assessment/update-assessment.dto';
import {
  CreateDraftResponseDto,
  PublishAssessmentResponseDto,
  UpdateAssessmentResponseDto,
  AssessmentListItemDto,
  AssessmentDetailDto,
  TeamTrackingItemDto,
  IndividualTrackingItemDto,
  DeleteAssessmentResponseDto,
} from '../../libs/dtos/assessment/assessment-response.dto';
import {
  ClassMemberGuard,
  ClassInstructorGuard,
  AssessmentMemberGuard,
  AssessmentInstructorGuard,
  AssessmentIdParam,
  GetClassContext,
  GetAssessmentContext,
} from '../../common/security';
import type { ClassContext, AssessmentContext } from '../../common/security/dtos/guard.dto';

@ApiTags('Assessments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) { }

  // ==================== LIST ASSESSMENTS BY CLASS ====================
  @Get('class/:classId')
  @UseGuards(ClassMemberGuard)
  @ApiOperation({
    summary: 'List all assessments for a class',
    description: 'Returns all assessments (assignments, quizzes, etc.) for a specific class, ordered by due date ascending.'
  })
  @ApiParam({ name: 'classId', type: Number, description: 'Class ID', example: 1 })
  @ApiOkResponse({
    description: 'Assessments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            title: 'Assignment 1: Data Structures',
            instruction: 'Implement a binary tree...',
            dueDate: '2024-01-20T23:59:59Z',
            startDate: '2024-01-10T00:00:00Z',
            maxScore: 100,
            session: 1,
            isPublic: true,
            submissionType: 'INDIVIDUAL',
            allowLate: false,
            aiEvaluationEnable: true,
            allowedSubmissionMethod: 'GITHUB',
            resources: []
          }
        ]
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async getAllByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @GetClassContext() context: ClassContext,
  ) {
    const data = await this.assessmentService.findAllByClass(context);
    return { success: true, data };
  }

  // ==================== LIST ASSESSMENTS BY CLASS SESSION ====================
  @Get('class/:classId/:sessionId')
  @UseGuards(ClassMemberGuard)
  @ApiOperation({
    summary: 'List all assessments for a class session',
    description: 'Returns all assessments for a specific class session/week, ordered by due date ascending.'
  })
  @ApiParam({ name: 'classId', type: Number, description: 'Class ID', example: 1 })
  @ApiParam({ name: 'sessionId', type: Number, description: 'Session/Week number', example: 1 })
  @ApiOkResponse({
    description: 'Assessments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            title: 'Week 1 Quiz',
            instruction: 'Complete the following questions...',
            dueDate: '2024-01-15T23:59:59Z',
            startDate: '2024-01-10T00:00:00Z',
            maxScore: 20,
            session: 1,
            isPublic: true,
            submissionType: 'INDIVIDUAL',
            allowLate: false,
            aiEvaluationEnable: false,
            allowedSubmissionMethod: 'FILE',
            resources: []
          }
        ]
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async getAllByClassSession(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @GetClassContext() context: ClassContext,
  ) {
    const data = await this.assessmentService.findAllByClassSession(sessionId, context);
    return { success: true, data };
  }

  // ==================== GET ASSESSMENT DETAILS ====================
  @Get(':id')
  @UseGuards(AssessmentMemberGuard)
  @AssessmentIdParam('id')
  @ApiOperation({
    summary: 'Get assessment details',
    description: 'Returns detailed information about an assessment including instructions, attached resources, and rubrics.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Assessment ID', example: 1 })
  @ApiOkResponse({
    description: 'Assessment details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          title: 'Assignment 1: Binary Tree Implementation',
          instruction: 'Implement a binary search tree with insert, search, and delete operations...',
          dueDate: '2024-01-20T23:59:59Z',
          startDate: '2024-01-10T00:00:00Z',
          maxScore: 100,
          session: 1,
          isPublic: true,
          submissionType: 'INDIVIDUAL',
          allowLate: false,
          penaltyCriteria: '10% off per day',
          aiEvaluationEnable: true,
          aiModelSelectionMode: 'SYSTEM',
          allowedSubmissionMethod: 'GITHUB',
          resources: [
            { id: 1, resource: { id: 1, title: 'starter_code.zip', type: 'FILE', url: 'https://...' } }
          ],
          rubrics: [
            { id: 1, definition: 'Code Quality', totalScore: 30 },
            { id: 2, definition: 'Correctness', totalScore: 50 },
            { id: 3, definition: 'Documentation', totalScore: 20 }
          ]
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Assessment not found',
    example: { statusCode: 404, message: 'Assessment not found', error: 'Not Found' }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @GetAssessmentContext() context: AssessmentContext,
  ) {
    const data = await this.assessmentService.findOne(context);
    return { success: true, data };
  }

  // ==================== CREATE DRAFT ====================
  @Post('class/:classId/draft')
  @UseGuards(ClassInstructorGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create assessment draft (Teacher)',
    description: 'Creates a new assessment draft for a class. Only the class owner can create assessments. The draft needs to be published before students can see it.'
  })
  @ApiParam({ name: 'classId', type: Number, description: 'Class ID', example: 1 })
  @ApiBody({
    description: 'Session number for the assessment',
    schema: {
      type: 'object',
      properties: {
        session: { type: 'number', example: 1, description: 'Session/Week number' }
      },
      required: ['session']
    },
    examples: {
      session1: {
        summary: 'Week 1 assessment',
        value: { session: 1 }
      },
      session5: {
        summary: 'Week 5 assessment',
        value: { session: 5 }
      }
    }
  })
  @ApiCreatedResponse({
    description: 'Draft created successfully',
    schema: {
      example: {
        success: true,
        data: {
          message: 'Draft created',
          assessmentId: 1
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
    example: { statusCode: 404, message: 'Class not found', error: 'Not Found' }
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to create assessments in this class',
    example: { statusCode: 403, message: 'You do not have permission to create assessments in this class', error: 'Forbidden' }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async createDraft(
    @Param('classId', ParseIntPipe) classId: number,
    @Body('session', ParseIntPipe) session: number,
    @GetClassContext() context: ClassContext,
  ) {
    const data = await this.assessmentService.createDraft(session, context);
    return { success: true, data };
  }

  // ==================== PUBLISH ASSESSMENT ====================
  @Patch(':id/publish')
  @UseGuards(AssessmentInstructorGuard)
  @AssessmentIdParam('id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish assessment (Teacher)',
    description: 'Publishes an assessment draft, making it visible to students. Validates that all required fields are filled: title, instruction, max score, dates, and rubrics totaling to max score.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Assessment ID', example: 1 })
  @ApiOkResponse({
    description: 'Assessment published successfully',
    schema: {
      example: {
        success: true,
        data: {
          message: 'Assessment published successfully'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Assessment not found',
    example: { statusCode: 404, message: 'Assessment not found', error: 'Not Found' }
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to publish this assessment',
    example: { statusCode: 403, message: 'You do not have permission to publish this assessment', error: 'Forbidden' }
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    examples: {
      alreadyPublished: {
        summary: 'Already published',
        value: { statusCode: 400, message: 'Assessment already published', error: 'Bad Request' }
      },
      missingTitle: {
        summary: 'Missing title',
        value: { statusCode: 400, message: 'Title is required', error: 'Bad Request' }
      },
      invalidDates: {
        summary: 'Invalid date range',
        value: { statusCode: 400, message: 'Invalid date range', error: 'Bad Request' }
      },
      rubricMismatch: {
        summary: 'Rubric total mismatch',
        value: { statusCode: 400, message: 'Rubric total score must equal maxScore', error: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async publishAssessment(
    @Param('id', ParseIntPipe) id: number,
    @GetAssessmentContext() context: AssessmentContext,
  ) {
    const data = await this.assessmentService.publishAssessment(context);
    return { success: true, data };
  }

  // ==================== UPDATE ASSESSMENT ====================
  @Patch(':id')
  @UseGuards(AssessmentInstructorGuard)
  @AssessmentIdParam('id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update assessment (Teacher)',
    description: `Updates an assessment draft with all details. This is where you configure the full assessment after creating a draft.
    
**Workflow:**
1. Create draft with \`POST /assessments/class/:classId/draft\` (only classId + session)
2. Update draft with this endpoint to fill in all assessment details
3. Publish with \`PATCH /assessments/:id/publish\` when ready

**File Filters (for AI evaluation):**
- \`user_exclude_files\`: Glob patterns for files/folders to EXCLUDE (e.g., test files, build outputs)
- \`user_include_files\`: Glob patterns for files/folders to INCLUDE (overrides excludes)`
  })
  @ApiParam({ name: 'id', type: Number, description: 'Assessment ID', example: 1 })
  @ApiBody({
    type: UpdateAssessmentDTO,
    description: 'Assessment update data - all fields are optional',
    examples: {
      fullSetup: {
        summary: 'Complete assessment setup',
        value: {
          title: 'Assignment 1: Binary Tree Implementation',
          instruction: 'Implement a binary search tree with insert, delete, and search operations. Include unit tests.',
          startDate: '2026-03-01T00:00:00Z',
          dueDate: '2026-03-15T23:59:59Z',
          maxScore: 100,
          submissionType: 'INDIVIDUAL',
          allowLate: true,
          allowedSubmissionMethod: 'GITHUB',
          aiEvaluationEnable: true,
          user_exclude_files: ['node_modules/', '.git/', 'test/', 'android/', 'ios/', 'build/', 'dist/'],
          user_include_files: ['src/**/*.ts', 'src/**/*.cpp', 'main.py'],
          rubrics: [
            { criterion: 'Code Quality & Structure', weight: 25 },
            { criterion: 'Correctness & Functionality', weight: 50 },
            { criterion: 'Documentation & Comments', weight: 15 },
            { criterion: 'Error Handling', weight: 10 }
          ],
          resources: [{ resourceId: 12 }]
        }
      },
      basicUpdate: {
        summary: 'Update title and instruction only',
        value: {
          title: 'Assignment 1: Updated Title',
          instruction: 'Updated instructions for the assignment...',
          maxScore: 100
        }
      },
      withRubrics: {
        summary: 'Update with rubrics',
        value: {
          title: 'Final Project',
          instruction: 'Complete the final project...',
          maxScore: 100,
          dueDate: '2026-02-15T23:59:59Z',
          rubrics: [
            { criterion: 'Code Quality', weight: 30 },
            { criterion: 'Functionality', weight: 50 },
            { criterion: 'Documentation', weight: 20 }
          ]
        }
      },
      teamAssessment: {
        summary: 'Team assessment with allowed teams',
        value: {
          title: 'Group Project',
          submissionType: 'TEAM',
          allowedTeamIds: [1, 2, 3],
          allowedSubmissionMethod: 'GITHUB'
        }
      },
      aiEvaluationSetup: {
        summary: 'Configure AI evaluation filters',
        value: {
          aiEvaluationEnable: true,
          aiModelSelectionMode: 'SYSTEM',
          user_exclude_files: ['android/', 'ios/', 'linux/', 'windows/', 'macos/', 'test/', 'web/'],
          user_include_files: ['android/app/build.gradle.kts', 'lib/**/*.dart']
        }
      },
      withResources: {
        summary: 'Attach instructor resources',
        value: {
          resources: [{ resourceId: 12 }, { resourceId: 13 }]
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Assessment updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          message: 'Draft updated successfully',
          assessment: {
            id: 1,
            title: 'Assignment 1: Binary Tree Implementation',
            instruction: 'Implement a binary search tree with insert, delete, and search operations...',
            dueDate: '2026-03-15T23:59:59Z',
            startDate: '2026-03-01T00:00:00Z',
            maxScore: 100,
            session: 1,
            isPublic: false,
            submissionType: 'INDIVIDUAL',
            allowLate: true,
            penaltyCriteria: null,
            aiEvaluationEnable: true,
            aiModelSelectionMode: 'SYSTEM',
            allowedSubmissionMethod: 'GITHUB',
            user_exclude_files: ['node_modules/', '.git/', 'test/'],
            user_include_files: ['src/**/*.ts'],
            rubrics: [
              { id: 1, definition: 'Code Quality', totalScore: 30 },
              { id: 2, definition: 'Functionality', totalScore: 50 },
              { id: 3, definition: 'Documentation', totalScore: 20 }
            ],
            resources: [{ id: 1, resource: { id: 12, title: 'starter_code.zip', type: 'FILE', url: 'https://...' } }]
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Assessment or resource not found',
    examples: {
      assessment: {
        summary: 'Assessment not found',
        value: { statusCode: 404, message: 'Assessment not found', error: 'Not Found' }
      },
      resource: {
        summary: 'Resource not found',
        value: { statusCode: 400, message: 'Resource 12 not found', error: 'Bad Request' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to update this assessment',
    example: { statusCode: 403, message: 'You do not have permission to update this assessment', error: 'Forbidden' }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssessmentDTO,
    @GetAssessmentContext() context: AssessmentContext,
  ) {
    const data = await this.assessmentService.updateAssessment(dto, context);
    return { success: true, data };
  }

  // ==================== DELETE ASSESSMENT ====================
  @Delete(':id')
  @UseGuards(AssessmentInstructorGuard)
  @AssessmentIdParam('id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete assessment (Teacher)',
    description: 'Permanently deletes an assessment and all associated submissions. Only the class owner can delete. This action cannot be undone.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Assessment ID', example: 1 })
  @ApiOkResponse({
    description: 'Assessment deleted successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          title: 'Assignment 1'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Assessment not found',
    example: { statusCode: 404, message: 'Assessment not found', error: 'Not Found' }
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to delete this assessment',
    example: { statusCode: 403, message: 'You do not have permission to delete this assessment', error: 'Forbidden' }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetAssessmentContext() context: AssessmentContext,
  ) {
    const data = await this.assessmentService.deleteAssessment(context);
    return { success: true, data };
  }

  // ==================== GET TRACKING / ROSTER ====================
  @Get(':id/tracking')
  @UseGuards(AssessmentInstructorGuard)
  @AssessmentIdParam('id')
  @ApiOperation({
    summary: 'Get assessment roster (Teacher)',
    description: 'Returns the submission status for all students or teams in the class. For team assessments, shows team-level status. For individual assessments, shows per-student status.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Assessment ID', example: 1 })
  @ApiOkResponse({
    description: 'Tracking data retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          { teamId: 1, name: 'Team Alpha', status: 'GRADED', score: 85 },
          { teamId: 2, name: 'Team Beta', status: 'SUBMITTED', score: null },
          { teamId: 3, name: 'Team Gamma', status: 'NOT_SUBMITTED', score: null }
        ]
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Assessment not found',
    example: { statusCode: 404, message: 'Assessment not found', error: 'Not Found' }
  })
  @ApiBadRequestResponse({
    description: 'Assessment not published yet',
    example: { statusCode: 400, message: 'Assessment is not published yet', error: 'Bad Request' }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
    example: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }
  })
  async getTracking(
    @Param('id', ParseIntPipe) assessmentId: number,
    @GetAssessmentContext() context: AssessmentContext,
  ) {
    const data = await this.assessmentService.getTracking(context);
    return { success: true, data };
  }
}