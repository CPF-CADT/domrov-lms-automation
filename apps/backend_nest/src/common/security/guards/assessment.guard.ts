import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuardService } from '../services/permission-guard.service';
import { UserRole } from '../../../libs/enums/Role';
import {
  AuthenticatedRequest,
  AssessmentContext,
} from '../dtos/guard.dto';

export const ASSESSMENT_ID_KEY = 'assessmentIdParam';

/**
 * Decorator to specify custom assessment ID parameter name
 */
export const AssessmentIdParam = (paramName: string) =>
  Reflect.metadata(ASSESSMENT_ID_KEY, paramName);

@Injectable()
abstract class BaseAssessmentGuard implements CanActivate {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly permissionService: PermissionGuardService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get assessment ID param name from decorator or default to 'assessmentId'
    const assessmentIdParam = this.reflector.getAllAndOverride<string>(ASSESSMENT_ID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'assessmentId';

    // Extract assessmentId from params, query, or body
    const assessmentId = this.extractAssessmentId(request, assessmentIdParam);

    if (!assessmentId) {
      throw new NotFoundException('Assessment ID not provided');
    }

    // Get assessment context and attach to request
    const assessmentContext = await this.permissionService.getAssessmentContext(user.id, assessmentId);
    request.assessmentContext = assessmentContext ?? undefined;
    request.classContext = assessmentContext?.classContext ?? undefined;

    // Call subclass implementation
    return this.checkPermission(context, user.id, assessmentId, assessmentContext);
  }

  protected extractAssessmentId(
    request: AuthenticatedRequest,
    paramName: string,
  ): number | undefined {
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    const body = request.body as Record<string, unknown>;

    // Try route params
    if (params?.[paramName]) {
      return parseInt(params[paramName], 10);
    }
    // Try query params
    if (query?.[paramName]) {
      return parseInt(query[paramName], 10);
    }
    // Try body
    if (body?.[paramName]) {
      return parseInt(String(body[paramName]), 10);
    }
    // Try 'id' as fallback
    if (paramName === 'assessmentId' && params?.id) {
      return parseInt(params.id, 10);
    }
    return undefined;
  }

  protected abstract checkPermission(
    context: ExecutionContext,
    userId: number,
    assessmentId: number,
    assessmentContext: AssessmentContext | null,
  ): Promise<boolean>;
}

// Checks if user is enrolled in the assessment's class
@Injectable()
export class AssessmentMemberGuard extends BaseAssessmentGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    assessmentId: number,
    assessmentContext: AssessmentContext | null,
  ): Promise<boolean> {
    if (!assessmentContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    return true;
  }
}

// Checks if user is a student in the assessment's class
@Injectable()
export class AssessmentStudentGuard extends BaseAssessmentGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    assessmentId: number,
    assessmentContext: AssessmentContext | null,
  ): Promise<boolean> {
    if (!assessmentContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    if (assessmentContext.classContext.role !== UserRole.Student) {
      throw new ForbiddenException('Only students can perform this action');
    }
    return true;
  }
}

// Checks if user is an instructor (Teacher or TA) in the assessment's class
@Injectable()
export class AssessmentInstructorGuard extends BaseAssessmentGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    assessmentId: number,
    assessmentContext: AssessmentContext | null,
  ): Promise<boolean> {
    if (!assessmentContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    const classContext = assessmentContext.classContext;
    const isInstructor =
      classContext.role === UserRole.Teacher ||
      classContext.role === UserRole.TeacherAssistant ||
      classContext.isOwner;

    if (!isInstructor) {
      throw new ForbiddenException('Only instructors can perform this action');
    }
    return true;
  }
}

// Checks if user is the class owner for the assessment
@Injectable()
export class AssessmentOwnerGuard extends BaseAssessmentGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    assessmentId: number,
    assessmentContext: AssessmentContext | null,
  ): Promise<boolean> {
    if (!assessmentContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    if (!assessmentContext.classContext.isOwner) {
      throw new ForbiddenException('Only the class owner can perform this action');
    }
    return true;
  }
}
