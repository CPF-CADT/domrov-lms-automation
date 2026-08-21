import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIUsageLog } from '../../libs/entities/ai/ai-usage-log.entity';
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';
import { User } from '../../libs/entities/user/user.entity';
import { CreateAIUsageLogDto } from '../../libs/dtos/wallet/user-ai-logs.dto';

@Injectable()
export class AIUsageLogService {
    constructor(
        @InjectRepository(AIUsageLog)
        private readonly logRepo: Repository<AIUsageLog>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(UserAIKey)
        private readonly keyRepo: Repository<UserAIKey>,
    ) { }

    // Create a new log entry
    async createLog(dto: CreateAIUsageLogDto): Promise<AIUsageLog> {
        const user = await this.userRepo.findOne({ where: { id: dto.userId } });
        if (!user) throw new NotFoundException('User not found');

        let userKey: UserAIKey = null;
        if (dto.userKeyId) {
            userKey = await this.keyRepo.findOne({ where: { id: dto.userKeyId } });
            if (!userKey) throw new NotFoundException('User AI Key not found');
        }

        const log = this.logRepo.create({
            title: dto.title,
            usingDate: dto.usingDate || new Date(),
            inputTokenCount: dto.inputTokenCount,
            outputTokenCount: dto.outputTokenCount,
            user,
            userKey,
        });

        return this.logRepo.save(log);
    }

    // Retrieve all logs for a user
    async getUserLogs(userId: number, limit = 50, offset = 0) {
        return this.logRepo.find({
            where: { user: { id: userId } },
            relations: ['user', 'userKey'],
            order: { usingDate: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    async getLogsByModel(userKeyId: number, limit = 50, offset = 0) {
        // Fetch the key first to get its model
        const key = await this.keyRepo.findOne({ where: { id: userKeyId } });
        if (!key) throw new NotFoundException('User AI Key not found');

        // Fetch all logs where the key's model matches
        return this.logRepo.find({
            where: { userKey: { model: key.model } },
            relations: ['user', 'userKey'],
            order: { usingDate: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    
}