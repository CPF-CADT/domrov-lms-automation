import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Class } from './class.entity';
import { UserRole } from '../enums/Role';

@Entity({ name: 'enrollments' })
export class Enrollment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.enrollments)
  @JoinColumn()
  user: User;

  @ManyToOne(() => Class, (cls) => cls.enrollments)
  @JoinColumn()
  class: Class;

  @Column({ type: "enum", enum: UserRole, default: UserRole.Student })
  role: UserRole;

}
