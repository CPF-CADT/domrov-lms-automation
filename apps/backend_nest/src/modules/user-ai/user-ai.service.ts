import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserAIKeyDto } from '../../libs/dtos/user/create-user-ai-key.dto';
import { UpdateUserAIKeyDto } from '../../libs/dtos/user/update-user-ai-key.dto';
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';
import { Encryption } from '../../libs/utils/Encryption';
import { AIConnectionTestService } from '../../services/ai-connection-test.service';
@Injectable()
export class UserAiService {
  constructor(
    @InjectRepository(UserAIKey)
    private readonly userAIRepo: Repository<UserAIKey>,

    private readonly aiConnectionTestService: AIConnectionTestService,
  ) {}

  // Create / store a new key
  async create(userId: number, dto: CreateUserAIKeyDto): Promise<UserAIKey> {
    try {
      if (userId < 0) {
        throw new NotFoundException('Failed to create user AI key');
      }
      if (!userId) throw new NotFoundException('User ID is required');
      if (!dto || typeof dto !== 'object' || !dto.apiKey)
        throw new NotFoundException('API key data is required');

      if(dto.provider === 'custom' && (!dto.apiEndpoint || dto.apiEndpoint.trim() === '')) {
        throw new NotFoundException('Custom provider requires an API endpoint');
      }

      const { apiKey, ...rest } = dto;

      await this.aiConnectionTestService.test({
        provider: dto.provider,
        apiKey:dto.apiKey,
        model: dto.model,
      });

      const encryptedKey = Encryption.encryptKey(apiKey);
      const key = this.userAIRepo.create({
        userId,
        encryptedKey,
        ...rest,
        isActive: true,
        isValid: true,
      });
      return await this.userAIRepo.save(key);
    } catch (err) {
      if(err instanceof NotFoundException) {
        throw err; // rethrow known exceptions
      }
      throw err; // bad request or other unexpected errors will be handled by the global exception filter
    }
  }

  // Get all keys for a user
  async findAll(userId: number): Promise<UserAIKey[]> {
    try {
      if (!userId) throw new NotFoundException('User ID is required');
      return await this.userAIRepo.find({ where: { userId } });
    } catch (err) {
      throw new NotFoundException('Failed to get user AI keys');
    }
  }

  // Get a single key
  async findOne(userId: number, id: number): Promise<UserAIKey> {
    try {
      if (!userId || !id)
        throw new NotFoundException('User ID and key ID are required');
      const key = await this.userAIRepo.findOne({ where: { id, userId } });
      if (!key) throw new NotFoundException('User AI Key not found');
      return key;
    } catch (err) {
      throw new NotFoundException('Failed to get user AI key');
    }
  }

  // Update a key
  async update(
    userId: number,
    id: number,
    dto: UpdateUserAIKeyDto,
  ): Promise<UserAIKey> {
    try {
    if (!dto || Object.keys(dto).length === 0) {
        throw new NotFoundException('Failed to update user AI key');
    }
      if (!userId || !id)
        throw new NotFoundException('User ID and key ID are required');
      if (!dto || typeof dto !== 'object')
        throw new NotFoundException('Update data is required');
      const key = await this.findOne(userId, id);
      if (dto.apiKey) {
        key.encryptedKey = Encryption.encryptKey(dto.apiKey);
      }
      if (dto.model) key.model = dto.model;
      if (dto.apiEndpoint) key.apiEndpoint = dto.apiEndpoint;
      if (dto.label) key.label = dto.label;
      if (dto.isActive !== undefined) key.isActive = dto.isActive;
      if (dto.isValid !== undefined) key.isValid = dto.isValid;
      if (dto.provider) key.provider = dto.provider;

      await this.aiConnectionTestService.test({
        provider: dto.provider,
        apiKey: dto.apiKey,
        model: key.model,
      });
      return await this.userAIRepo.save(key);
    } catch (err) {
      throw new NotFoundException('Failed to update user AI key');
    }
  }

  // Delete a key
  async remove(userId: number, id: number): Promise<void> {
    try {
      if (!userId || !id)
        throw new NotFoundException('User ID and key ID are required');
      const key = await this.findOne(userId, id);
      await this.userAIRepo.remove(key);
    } catch (err) {
      throw new NotFoundException('Failed to remove user AI key');
    }
  }

  // Decrypt key for usage
  async getDecryptedKey(userId: number, id: number): Promise<string> {
    try {
      if (!userId || !id)
        throw new NotFoundException('User ID and key ID are required');
      const key = await this.findOne(userId, id);
      return Encryption.decryptKey(key.encryptedKey);
    } catch (err) {
      throw new NotFoundException('Failed to decrypt user AI key');
    }
  }
}