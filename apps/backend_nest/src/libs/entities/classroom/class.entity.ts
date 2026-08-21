import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Enrollment } from './enrollment.entity';
import { Team } from './team.entity';
import { Assessment } from '../assessment/assessment.entity';
import { ClassStatus } from '../../enums/Status';
@Entity({ name: 'classes' })
// Index for finding classes owned by a user (class.service.ts line 190: find owned classes)
@Index(['owner'])
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

  @ManyToOne(() => User, (user) => user.classes, { onDelete: 'CASCADE' })
  @JoinColumn()
  owner: User;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.class)
  enrollments: Enrollment[];

  @OneToMany(() => Team, (team) => team.class)
  teams: Team[];

  @OneToMany(() => Assessment, (assessment) => assessment.class)
  assessments: Assessment[];

}