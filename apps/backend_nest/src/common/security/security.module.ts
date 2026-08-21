import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../../libs/entities/classroom/enrollment.entity';
import { Class } from '../../libs/entities/classroom/class.entity';
import { Team } from '../../libs/entities/classroom/team.entity';
import { TeamMember } from '../../libs/entities/classroom/user-team.entity';
import { Assessment } from '../../libs/entities/assessment/assessment.entity';
import { Submission } from '../../libs/entities/assessment/submission.entity';

// Permission Services
import { PermissionGuardService } from './services/permission-guard.service';
import { ClassPermissionService } from './services/class-permission.service';
import { TeamPermissionService } from './services/team-permission.service';
import { AssessmentPermissionService } from './services/assessment-permission.service';
import { SubmissionPermissionService } from './services/submission-permission.service';

// Class Guards
import {
    ClassMemberGuard,
    ClassStudentGuard,
    ClassInstructorGuard,
    ClassOwnerGuard,
} from './guards/class.guard';

// Team Guards
import {
    TeamMemberGuard,
    TeamApprovedMemberGuard,
    TeamLeaderGuard,
    TeamManagerGuard,
} from './guards/team.guard';

// Assessment Guards
import {
    AssessmentMemberGuard,
    AssessmentStudentGuard,
    AssessmentInstructorGuard,
    AssessmentOwnerGuard,
} from './guards/assessment.guard';

// Submission Guards
import {
    SubmissionMemberGuard,
    SubmissionInstructorGuard,
    SubmissionOwnerGuard,
} from './guards/submission.guard';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Enrollment, Class, Team, TeamMember, Assessment, Submission]),
    ],
    providers: [
        // Permission Services
        ClassPermissionService,
        TeamPermissionService,
        AssessmentPermissionService,
        SubmissionPermissionService,
        PermissionGuardService,
        // Class Guards
        ClassMemberGuard,
        ClassStudentGuard,
        ClassOwnerGuard,
        ClassInstructorGuard,
        // Team Guards
        TeamMemberGuard,
        TeamApprovedMemberGuard,
        TeamLeaderGuard,
        TeamManagerGuard,
        // Assessment Guards
        AssessmentMemberGuard,
        AssessmentStudentGuard,
        AssessmentInstructorGuard,
        AssessmentOwnerGuard,
        // Submission Guards
        SubmissionMemberGuard,
        SubmissionInstructorGuard,
        SubmissionOwnerGuard,
    ],
    exports: [
        // Permission Services
        ClassPermissionService,
        TeamPermissionService,
        AssessmentPermissionService,
        SubmissionPermissionService,
        PermissionGuardService,
        // Class Guards
        ClassMemberGuard,
        ClassStudentGuard,
        ClassInstructorGuard,
        ClassOwnerGuard,
        // Team Guards
        TeamMemberGuard,
        TeamApprovedMemberGuard,
        TeamLeaderGuard,
        TeamManagerGuard,
        // Assessment Guards
        AssessmentMemberGuard,
        AssessmentStudentGuard,
        AssessmentInstructorGuard,
        AssessmentOwnerGuard,
        // Submission Guards
        SubmissionMemberGuard,
        SubmissionInstructorGuard,
        SubmissionOwnerGuard,
    ],
})
export class SecurityModule { }
