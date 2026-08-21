import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuardService } from '../services/permission-guard.service';
import { CLASS_ID_KEY, REQUIRED_ROLES_KEY } from '../decorators/class.decorator';
import { UserRole } from '../../../libs/enums/Role';
import {
  AuthenticatedRequest,
  ClassContext,
  ClassIdParams,
  ClassIdQuery,
  ClassIdBody,
} from '../dtos/guard.dto';

@Injectable()
abstract class BaseClassGuard implements CanActivate {
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

    // Get class ID param name from decorator or default to 'classId'
    const classIdParam = this.reflector.getAllAndOverride<string>(CLASS_ID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'classId';

    // Extract classId from params, query, or body
    const classId = this.extractClassId(request, classIdParam);

    if (!classId) {
      throw new NotFoundException('Class ID not provided');
    }

    // Get class context and attach to request
    const classContext = await this.permissionService.getClassContext(user.id, classId);
    request.classContext = classContext ?? undefined;

    // Call subclass implementation
    return this.checkPermission(context, user.id, classId, classContext);
  }

  protected extractClassId(
    request: AuthenticatedRequest,
    paramName: string,
  ): number | undefined {
    const params = request.params as ClassIdParams;
    const query = request.query as ClassIdQuery;
    const body = request.body as ClassIdBody;

    // Try route params
    if (params?.[paramName as keyof ClassIdParams]) {
      return parseInt(params[paramName as keyof ClassIdParams] as string, 10);
    }
    // Try query params
    if (query?.[paramName as keyof ClassIdQuery]) {
      return parseInt(query[paramName as keyof ClassIdQuery] as string, 10);
    }
    // Try body
    if (body?.[paramName as keyof ClassIdBody]) {
      return parseInt(String(body[paramName as keyof ClassIdBody]), 10);
    }
    // Try 'id' as fallback
    if (paramName === 'classId' && params?.id) {
      return parseInt(params.id, 10);
    }
    return undefined;
  }

  protected abstract checkPermission(
    context: ExecutionContext,
    userId: number,
    classId: number,
    classContext: ClassContext | null,
  ): Promise<boolean>;
}

// Checks if user is enrolled in the class
@Injectable()
export class ClassMemberGuard extends BaseClassGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    classId: number,
    classContext: ClassContext | null,
  ): Promise<boolean> {
    if (!classContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    return true;
  }
}

// Checks if user is a student
@Injectable()
export class ClassStudentGuard extends BaseClassGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    classId: number,
    classContext: ClassContext | null,
  ): Promise<boolean> {
    if (!classContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    if (classContext.role !== UserRole.Student) {
      throw new ForbiddenException('Only students can perform this action');
    }
    return true;
  }
}

// Checks if user is an instructor (Teacher or TA)
@Injectable()
export class ClassInstructorGuard extends BaseClassGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    classId: number,
    classContext: ClassContext | null,
  ): Promise<boolean> {
    if (!classContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
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

// Checks if user is the class owner
@Injectable()
export class ClassOwnerGuard extends BaseClassGuard {
  protected async checkPermission(
    context: ExecutionContext,
    userId: number,
    classId: number,
    classContext: ClassContext | null,
  ): Promise<boolean> {
    if (!classContext) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    if (!classContext.isOwner) {
      throw new ForbiddenException('Only the class owner can perform this action');
    }
    return true;
  }
}
