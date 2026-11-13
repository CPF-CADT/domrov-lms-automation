import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AcademicClass, Assignment, Enrollment, Resource, Rubric, Submission, Team, TeamMember } from '../entities';
import { InitialAcademicSchema1764000000000 } from './migrations/1764000000000-InitialAcademicSchema';

export const academicDataSourceOptions = { type: 'postgres' as const, url: process.env.DATABASE_URL, entities: [AcademicClass, Enrollment, Team, TeamMember, Assignment, Rubric, Resource, Submission], migrations: [InitialAcademicSchema1764000000000], synchronize: false };
export default new DataSource(academicDataSourceOptions);
