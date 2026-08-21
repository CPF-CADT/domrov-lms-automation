import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Class } from './class.entity';
import { UserRole } from '../../enums/Role';
import { BaseEntity } from '../base.entity';

@Entity({ name: 'enrollments' })
// Composite index for authorization: verify if user is enrolled in class (5+ queries in class.service)
@Index(['user', 'class'])
export class Enrollment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Class, (cls) => cls.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn()
  class: Class;

  @Column({ type: "enum", enum: UserRole, default: UserRole.Student })
  role: UserRole;

}
