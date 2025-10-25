import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TokenPackage } from './token-package.entity';
import { UserTokenBalance } from './user-token-balance.entity';
import { AIUsageLog } from './ai-usage-log.entity';
import { Assessment } from './assessment.entity';

@Entity({ name: 'platform_ai_models' })
export class PlatformAIModel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column({ length: 100 })
  name: string; 

  @Column()
  apiUrl: string; 

  @Column({ type: 'float', nullable: true })
  accuracy: number; 

  @OneToMany(() => TokenPackage, (pkg) => pkg.model)
  tokenPackages: TokenPackage[];

  @OneToMany(() => UserTokenBalance, (balance) => balance.model)
  userBalances: UserTokenBalance[];

  @OneToMany(() => AIUsageLog, (log) => log.model)
  usageLogs: AIUsageLog[];
  
  @OneToMany(() => Assessment, (assessment) => assessment.aiModel)
  assessments: Assessment[];
}