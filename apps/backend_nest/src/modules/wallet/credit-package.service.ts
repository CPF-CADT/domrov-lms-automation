// credit-package.service.ts (updated to use float numbers instead of string)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditPackage } from '../../libs/entities/ai/credit-package.entity';
import {
  CreateCreditPackageDto,
  UpdateCreditPackageDto,
} from '../../libs/dtos/wallet/wallet.dto';
import { CreditPackageResponseDto } from '../../libs/dtos/wallet/credit-package-response.dto';
import { MessageResponseDto } from '../../libs/dtos/common/message-response.dto';

@Injectable()
export class CreditPackageService {
  constructor(
    @InjectRepository(CreditPackage)
    private readonly packageRepository: Repository<CreditPackage>,
  ) { }

  async create(dto: CreateCreditPackageDto): Promise<CreditPackageResponseDto> {
    try {
      if (!dto || typeof dto !== 'object') throw new NotFoundException('Invalid credit package data');
      const creditPackage = this.packageRepository.create({
        ...dto,
        currency: dto.currency,
        bonusCredits: dto.bonusCredits || 0,
        credits: dto.credits,
        price: dto.price,
      });
      return await this.packageRepository.save(creditPackage);
    } catch (err) {
      throw new NotFoundException('Failed to create credit package');
    }
  }

  async findAll(): Promise<CreditPackageResponseDto[]> {
    try {
      return await this.packageRepository.find({
        order: { sortOrder: 'ASC', price: 'ASC' },
      });
    } catch (err) {
      throw new NotFoundException('Failed to get credit packages');
    }
  }

  async findAllActive(): Promise<CreditPackageResponseDto[]> {
    try {
      return await this.packageRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', price: 'ASC' },
      });
    } catch (err) {
      throw new NotFoundException('Failed to get active credit packages');
    }
  }

  private async findOneEntity(id: number): Promise<CreditPackage> {
    if (!id) throw new NotFoundException('Credit package ID is required');
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Credit package with ID ${id} not found`);
    }
    return pkg;
  }

  async findOne(id: number): Promise<CreditPackageResponseDto> {
    try {
      return await this.findOneEntity(id);
    } catch (err) {
      throw new NotFoundException('Failed to get credit package');
    }
  }

  async update(id: number, dto: UpdateCreditPackageDto): Promise<CreditPackageResponseDto> {
    try {
      if (!id) throw new NotFoundException('Credit package ID is required');
      if (!dto || typeof dto !== 'object') throw new NotFoundException('Invalid update data');
      const pkg = await this.findOneEntity(id);
      Object.assign(pkg, dto);
      return await this.packageRepository.save(pkg);
    } catch (err) {
      throw new NotFoundException('Failed to update credit package');
    }
  }

  async remove(id: number): Promise<MessageResponseDto> {
    try {
      if (!id) throw new NotFoundException('Credit package ID is required');
      const pkg = await this.findOneEntity(id);
      await this.packageRepository.remove(pkg);
      return { message: `Credit package with ID ${id} deleted successfully` };
    } catch (err) {
      throw new NotFoundException('Failed to delete credit package');
    }
  }

  async toggleActive(id: number): Promise<CreditPackageResponseDto> {
    try {
      if (!id) throw new NotFoundException('Credit package ID is required');
      const pkg = await this.findOneEntity(id);
      pkg.isActive = !pkg.isActive;
      return await this.packageRepository.save(pkg);
    } catch (err) {
      throw new NotFoundException('Failed to toggle credit package active state');
    }
  }
}