import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTokenPackageDTO } from '../../../libs/dtos/wallet/create-package.dto';
import { TokenPackage } from '../../../libs/entities/token-package.entity';

@Injectable()
export class TokenPackageService {
    constructor(
        @InjectRepository(TokenPackage) private repo: Repository<TokenPackage>
    ) { }

    async create(dto: CreateTokenPackageDTO) {
        return await this.repo.save(this.repo.create(dto));
    }

    async findAllActive() {
        return await this.repo.find({ where: { isActive: true } });
    }

    async findAllAdmin() {
        return await this.repo.find();
    }

    async toggleStatus(id: number) {
        const pkg = await this.repo.findOne({ where: { id } });
        if (pkg) {
            pkg.isActive = !pkg.isActive;
            return await this.repo.save(pkg);
        }
        return null;
    }
}