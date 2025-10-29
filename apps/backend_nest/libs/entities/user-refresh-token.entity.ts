import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    Column,
    BaseEntity,
    Index,
    OneToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_refresh_token' })
export class UserRefreshToken extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.refreshTokens)
    user: User;

    @Column()
    refreshToken: string;

    @Column()
    expiresAt: Date;

}
