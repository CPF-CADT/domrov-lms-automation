import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from '../entities';
import { InitialAcademicSchema1764000000000 } from './migrations/1764000000000-InitialAcademicSchema';
import { UseStringUserIds1764000002000 } from './migrations/1764000002000-UseStringUserIds';
import { AddMissingAcademicColumns1764000003000 } from './migrations/1764000003000-AddMissingAcademicColumns';
import { AddAssignmentWorkflowColumns1764000004000 } from './migrations/1764000004000-AddAssignmentWorkflowColumns';
import { AddRubricCriterion1764000005000 } from './migrations/1764000005000-AddRubricCriterion';

export const academicDataSourceOptions = { type: 'postgres' as const, url: process.env.DATABASE_URL, entities: [AcademicClass, Enrollment, Team, TeamMember, Assignment, Rubric, Resource, Submission], migrations: [InitialAcademicSchema1764000000000, UseStringUserIds1764000002000, AddMissingAcademicColumns1764000003000, AddAssignmentWorkflowColumns1764000004000, AddRubricCriterion1764000005000], synchronize: false };
export default new DataSource(academicDataSourceOptions);
