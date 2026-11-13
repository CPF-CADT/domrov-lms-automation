import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('classes')
export class AcademicClass {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 300 }) name!: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ name: 'cover_image_url', type: 'text', nullable: true }) coverImageUrl?: string;
  @Column({ name: 'owner_id', type: 'uuid' }) ownerId!: string;
  @Column({ name: 'join_code', length: 6, unique: true }) joinCode!: string;
  @Column({ length: 20, default: 'active' }) status!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('enrollments')
@Index(['classId', 'userId'], { unique: true })
export class Enrollment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'class_id', type: 'uuid' }) classId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ length: 30, default: 'active' }) status!: string;
  @Column({ length: 30, default: 'student' }) role!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('teams')
@Index(['classId', 'name'], { unique: true })
export class Team {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'class_id', type: 'uuid' }) classId!: string;
  @Column({ length: 300 }) name!: string;
  @Column({ name: 'leader_id', type: 'uuid', nullable: true }) leaderId?: string;
  @Column({ name: 'join_code', length: 6, unique: true }) joinCode!: string;
  @Column({ name: 'max_members', default: 5 }) maxMembers!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('team_members')
@Index(['teamId', 'userId'], { unique: true })
export class TeamMember {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'team_id', type: 'uuid' }) teamId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('assignments')
@Index(['classId'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'class_id', type: 'uuid' }) classId!: string;
  @Column({ length: 255 }) title!: string;
  @Column({ type: 'text' }) instruction!: string;
  @Column({ name: 'max_score', type: 'numeric' }) maxScore!: number;
  @Column({ name: 'ai_evaluation_enabled', default: false }) aiEvaluationEnabled!: boolean;
  @Column({ name: 'start_at', type: 'timestamptz', nullable: true }) startAt?: Date;
  @Column({ name: 'due_at', type: 'timestamptz', nullable: true }) dueAt?: Date;
  @Column({ name: 'allow_late', default: false }) allowLate!: boolean;
  @Column({ name: 'submission_type', length: 30, default: 'INDIVIDUAL' }) submissionType!: string;
  @Column({ name: 'allowed_submission_method', length: 30, default: 'ANY' }) allowedSubmissionMethod!: string;
  @Column({ name: 'session', type: 'integer', nullable: true }) session?: number;
  @Column({ name: 'is_public', default: false }) isPublic!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('rubrics')
export class Rubric {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'assignment_id', type: 'uuid' }) assignmentId!: string;
  @Column({ type: 'text' }) definition!: string;
  @Column({ type: 'text', nullable: true }) criterion?: string;
  @Column({ name: 'total_score', type: 'numeric' }) totalScore!: number;
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 255 }) title!: string;
  @Column({ length: 50, default: 'file' }) type!: string;
  @Column({ type: 'text' }) url!: string;
  @Column({ name: 'owner_id', type: 'uuid' }) ownerId!: string;
  @Column({ name: 'content_type', type: 'text', nullable: true }) contentType?: string;
  @Column({ type: 'bigint', nullable: true }) size?: number;
  @Column({ name: 'storage_provider', length: 30, default: 'external' }) storageProvider!: string;
}

@Entity('submissions')
@Index(['assignmentId', 'userId'])
export class Submission {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'assignment_id', type: 'uuid' }) assignmentId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'team_id', type: 'uuid', nullable: true }) teamId?: string;
  @Column({ name: 'resource_id', type: 'uuid' }) resourceId!: string;
  @Column({ length: 40, nullable: true }) language?: string;
  @Column({ length: 30, default: 'stored' }) status!: string;
  @Column({ name: 'evaluation_id', type: 'uuid', nullable: true }) evaluationId?: string;
  @Column({ type: 'numeric', nullable: true }) score?: number;
  @Column({ type: 'text', nullable: true }) feedback?: string;
  @Column({ type: 'text', nullable: true }) comments?: string;
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt?: Date;
  @Column({ name: 'graded_by', type: 'uuid', nullable: true }) gradedBy?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
