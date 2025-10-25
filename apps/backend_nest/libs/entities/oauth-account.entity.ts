import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { OAuthProvider } from './oauth-provider.entity';

@Entity({ name: 'oauth_accounts' })
export class OAuthAccount extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  accountId: string; 

  @ManyToOne(() => User)
  @JoinColumn()
  user: User; 

  @ManyToOne(() => OAuthProvider, (provider) => provider.accounts)
  @JoinColumn()
  provider: OAuthProvider; 
}