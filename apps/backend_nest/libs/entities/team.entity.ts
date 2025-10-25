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
import { Class } from './class.entity';
import { TeamMember } from './user-team.entity';

@Entity({ name: 'teams' })
export class Team extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 300 })
    name: string;

    @Column({ unique: true, length: 6 })
    joinCode: string;

    @Column()
    maxMember: number;

    @ManyToOne(() => User, (user) => user.leadTeams)
    @JoinColumn()
    leader: User;

    @ManyToOne(() => Class, (cls) => cls.teams)
    @JoinColumn()
    class: Class;

    @OneToMany(() => TeamMember, (member) => member.team)
    members: TeamMember[];
}
