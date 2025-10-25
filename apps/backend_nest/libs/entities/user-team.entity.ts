import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  BaseEntity,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from './user.entity';

@Entity({ name: 'team_members' })
export class TeamMember extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Team, (team) => team.members)
  @JoinColumn()
  team: Team;

  @ManyToOne(() => User, (user) => user.teamMemberships)
  @JoinColumn()
  user: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  enrollDate: Date;

  @Column({ default: false })
  isApproved: boolean;
}
