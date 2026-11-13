import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SystemRole, User, UserStatus } from '../entities/user.entity';
import { ListUsersQuery, UpdateUserRoleRequest, UpdateUserStatusRequest } from './admin-user.dto';

@Injectable()
export class AdminUserService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async list(query: ListUsersQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const builder = this.users.createQueryBuilder('user');
    if (query.search) {
      builder.andWhere(new Brackets((where) => where
        .where('user.email ILIKE :search', { search: `%${query.search}%` })
        .orWhere('user.firstName ILIKE :search', { search: `%${query.search}%` })
        .orWhere('user.lastName ILIKE :search', { search: `%${query.search}%` })
        .orWhere('user.phoneNumber ILIKE :search', { search: `%${query.search}%` })));
    }
    if (query.status) builder.andWhere('user.status = :status', { status: query.status });
    if (query.role) builder.andWhere('user.role = :role', { role: query.role });
    const [users, total] = await builder.orderBy('user.created_at', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data: users.map((user) => this.publicUser(user)), total, page, limit };
  }

  async get(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.publicUser(user);
  }

  async updateStatus(userId: number, input: UpdateUserStatusRequest) {
    const user = await this.find(userId);
    user.status = input.status;
    return this.publicUser(await this.users.save(user));
  }

  async updateRole(userId: number, input: UpdateUserRoleRequest) {
    const user = await this.find(userId);
    user.role = input.role;
    return this.publicUser(await this.users.save(user));
  }

  async remove(userId: number) {
    const user = await this.find(userId);
    user.status = UserStatus.INACTIVE;
    await this.users.save(user);
    return { message: 'User deactivated successfully' };
  }

  private find(userId: number) {
    return this.users.findOne({ where: { id: userId } }).then((user) => {
      if (!user) throw new NotFoundException('User not found');
      return user;
    });
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      gender: user.gender,
      dob: user.dob,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
      isVerified: user.isVerified,
      isTwoFactorEnable: user.isTwoFactorEnable,
      status: user.status,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
