import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';
import { Team } from './team.entity';
import { Module } from './module.entity';
import { Quiz } from './quiz.entity';
import { Assessment } from './assessment.entity';
import { ClassResource } from './class-resource.entity';
import { ClassStatus } from '../enums/Status'; 

@Entity({ name: 'classes' })
export class Class extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ length: 300 })
  name: string; 

  @Column({ nullable: true })
  description: string; 

  @Column({ unique: true, length: 6 })
  joinCode: string; 

  @Column({ nullable: true })
  coverImageUrl: string; 

  @Column({
    type: 'enum',
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  status: ClassStatus;


  @ManyToOne(() => User, (user) => user.classes)
  @JoinColumn() 
  owner: User; 

  @OneToMany(() => Enrollment, (enrollment) => enrollment.class)
  enrollments: Enrollment[]; 

  @OneToMany(() => Team, (team) => team.class)
  teams: Team[]; 

  @OneToMany(() => Module, (module) => module.class)
  modules: Module[]; 

  @OneToMany(() => Quiz, (quiz) => quiz.class)
  quizzes: Quiz[]; 

  @OneToMany(() => Assessment, (assessment) => assessment.class)
  assessments: Assessment[]; 

  @OneToMany(() => ClassResource, (cr) => cr.class)
  resources: ClassResource[]; 
}