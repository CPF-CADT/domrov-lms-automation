// Enums
export * from './enums';

// Common API types
export * from './api';

// Entity types
export type { AIUsageLog } from './aiUsageLog';
export type { Assessment } from './assessment';
export type { Class } from './class';
export type { StatusFilter, ClassCard, CreateClassInput } from './classCard';
export type { Enrollment } from './enrollment';
export type { Evaluation } from './evaluation';
export type { Module } from './module';
export type { OAuthAccount } from './oauthAccount';
export type { OAuthProvider } from './oauthProvider';
export type { Payment } from './payment';
export type { Quiz } from './quiz';
export type { QuizResult } from './quizResult';
export type { Resource } from './resource';
export type { Submission } from './submission';
export type { SubmissionFile, SubmissionLink, SubmissionCodeFile, SubmissionRecord } from './submissionRecord';
export type { Team } from './team';
export type { TelegramChat } from './telegramChat';
export type { TokenPackage } from './tokenPackage';
export type { Topic } from './topic';
export type { User } from './user';
export type { UserTeam } from './userTeam';
export type { UserTokenBalance } from './userTokenBalance';

// Auth DTOs
export * from './auth';

// User DTOs
export type {
    UpdateProfileDto,
    ChangePasswordDto,
    UserProfileResponseDto,
    UpdateProfileResponseDto,
    ChangePasswordResponseDto,
    UserListItemDto,
    UserBasicInfoDto,
    UserResponseDto,
} from './user';

// Class DTOs
export type {
    ClassOwnerDto,
    ClassMemberDto,
    ClassResponseDto,
    GetMyClassesResponseDto,
    CreateClassDto,
    UpdateClassDto,
    JoinClassByCodeDto,
    JoinClassByTokenDto,
    JoinClassResponseDto,
    ClassMembersDto,
    InviteMembersDto,
    InviteMembersResponseDto,
    RemoveMemberResponseDto,
    TransferOwnershipDto,
    TransferOwnershipResponseDto,
    AssignTADto,
    AssignTAResponseDto,
    CompleteClassResponseDto,
    LeaderboardItemDto,
} from './class';

// Assessment DTOs
export type {
    ResourceInfoDto,
    AssessmentResourceDto,
    RubricDto,
    ClassInfoForAssessmentDto,
    AIModelInfoDto,
    TeamAssessmentDto,
    AssessmentListItemDto,
    AssessmentDetailDto,
    CreateDraftResponseDto,
    PublishAssessmentResponseDto,
    UpdateAssessmentResponseDto,
    DeleteAssessmentResponseDto,
    TeamTrackingItemDto,
    IndividualTrackingItemDto,
    UpdateResourceDTO,
    UpdateRubricDTO,
    UpdateAssessmentDto,
    CreateAssessmentDto,
    AssessmentTrackingResponseDto,
    AssessmentStatsResponseDto,
    CompleteAssessmentResponseDto,
} from './assessment';

// Team DTOs
export type {
    CreateTeamDto,
    CreateTeamItemDto,
    CreateManyTeamsDto,
    TeamResponseDto,
    JoinTeamDto,
    InviteTeamByEmailDto,
    JoinTeamByTokenDto,
    JoinTeamResponseDto,
    CreateManyTeamsResponseDto,
} from './team';

// Submission DTOs
export type {
    SubmitResourceDTO,
    SubmitAssignmentDto,
    GradeSubmissionDTO,
    FeedbackItemDto,
    SubmitAssignmentResponseDto,
    ApproveSubmissionResponseDto,
    AddFeedbackResponseDto,
    UpdateFeedbackResponseDto,
    TeamMemberDto,
    TeamInfoDto,
    ClassBasicInfoDto,
    AssessmentBasicInfoDto,
    ResourceBasicInfoDto,
    SubmissionResourceDto,
    EvaluationFeedbackItemDto,
    EvaluationResponseDto,
    EvaluationSummaryDto,
    SubmissionViewerResponseDto,
    MySubmissionResourceDto,
    MySubmissionResponseDto,
    SubmissionStatusItemDto,
    RosterMemberDto,
    TeamRosterItemDto,
    IndividualRosterItemDto,
} from './submission';

// Evaluation DTOs
export type {
    FileContentDto,
    ProcessSubmissionResponseDto,
    FolderNodeDto,
    FolderStructureResponseDto,
    AddToQueueDto,
    AddToQueueResponseDto,
} from './evaluation';

// File DTOs
export type {
    PresignedUrlRequestDto,
    PresignedUrlResponseDto,
    NotifyUploadDto,
    NotifyUploadResponseDto,
    CloudinaryPresignedParams,
    CloudinaryUploadResponse,
} from './file';
