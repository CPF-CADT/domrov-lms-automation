import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity'; 
import { OAuthAccount } from './oauth-account.entity';

@Entity({ name: 'oauth_providers' })
export class OAuthProvider extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ length: 100, unique: true })
  name: string; 

  @Column()
  authUrl: string; 

  @Column()
  clientId: string; 

  @Column()
  clientSecret: string; 

  @OneToMany(() => OAuthAccount, (account) => account.provider)
  accounts: OAuthAccount[];
}