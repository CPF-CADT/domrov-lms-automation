import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClassContext, TeamContext, AssessmentContext, SubmissionContext, AuthenticatedRequest } from '../dtos/guard.dto';

// Get ClassContext from request (set by class guards)
export const GetClassContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClassContext | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.classContext;
  },
);

// Get TeamContext from request (set by team guards)
export const GetTeamContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TeamContext | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.teamContext;
  },
);

// Get AssessmentContext from request (set by assessment guards)
export const GetAssessmentContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AssessmentContext | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.assessmentContext;
  },
);

// Get SubmissionContext from request (set by submission guards)
export const GetSubmissionContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SubmissionContext | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.submissionContext;
  },
);

// Get specific field from ClassContext
export const ClassContextField = createParamDecorator(
  (field: keyof ClassContext, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.classContext?.[field];
  },
);

// Get specific field from TeamContext
export const TeamContextField = createParamDecorator(
  (field: keyof TeamContext, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.teamContext?.[field];
  },
);
