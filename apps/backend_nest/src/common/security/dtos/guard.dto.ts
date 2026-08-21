import { Request } from 'express';
import { UserRole } from '../../../libs/enums/Role';
import { Enrollment } from '../../../libs/entities/classroom/enrollment.entity';
import { Class } from '../../../libs/entities/classroom/class.entity';
import { Team } from '../../../libs/entities/classroom/team.entity';
import { TeamMember } from '../../../libs/entities/classroom/user-team.entity';
import { Assessment } from '../../../libs/entities/assessment/assessment.entity';
import { Submission } from '../../../libs/entities/assessment/submission.entity';

/**
 * Authenticated user payload extracted from JWT token.
 * Represents the minimal user information attached to the request.
 */
export interface AuthenticatedUser {
    id: number;
    email: string;
    firstName: string;
    lastName?: string;
    isVerified: boolean;
    isTwoFactorEnable: boolean;
}

/**
 * Context containing user's class membership and permissions.
 * Attached to request by class guards.
 */
export interface ClassContext {
    classId: number;
    userId: number;
    role: UserRole;
    isOwner: boolean;
    classEntity: Class;
    enrollment?: Enrollment;
}

/**
 * Context containing user's team membership and permissions.
 * Attached to request by team guards.
 */
export interface TeamContext {
    teamId: number;
    userId: number;
    isLeader: boolean;
    isMember: boolean;
    isApproved: boolean;
    teamEntity: Team;
    membership?: TeamMember;
}

/**
 * Context containing assessment and user's permissions.
 * Attached to request by assessment guards.
 */
export interface AssessmentContext {
    assessmentId: number;
    userId: number;
    assessmentEntity: Assessment;
    classContext: ClassContext;
}

/**
 * Context containing submission and user's permissions.
 * Attached to request by submission guards.
 */
export interface SubmissionContext {
    submissionId: number;
    userId: number;
    submissionEntity: Submission;
    classContext: ClassContext;
}

/**
 * Extended Express Request with authentication and context data.
 * Use this interface for type-safe request handling in guards and controllers.
 */
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
    classContext?: ClassContext;
    teamContext?: TeamContext;
    assessmentContext?: AssessmentContext;
    submissionContext?: SubmissionContext;
}

/**
 * Request params containing class ID.
 */
export interface ClassIdParams {
    classId?: string;
    id?: string;
}

/**
 * Request params containing team ID.
 */
export interface TeamIdParams {
    teamId?: string;
    id?: string;
}

/**
 * Request body that may contain class ID.
 */
export interface ClassIdBody {
    classId?: number | string;
}

/**
 * Request body that may contain team ID.
 */
export interface TeamIdBody {
    teamId?: number | string;
}

/**
 * Query params that may contain class ID.
 */
export interface ClassIdQuery {
    classId?: string;
}

/**
 * Query params that may contain team ID.
 */
export interface TeamIdQuery {
    teamId?: string;
}
