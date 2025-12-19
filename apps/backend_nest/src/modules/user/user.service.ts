import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from '../../../libs/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdateUserDTO } from '../../../libs/dtos/update.user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async update(id: string, updateUserDto: UpdateUserDTO) {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const result = await this.userRepository.update(id, updateUserDto);

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User updated successfully',
      affectedRows: result.affected,
    };
  }
async findByQuery(query: Record<string, any>): Promise<User[] | User> {
  const { id, email, firstName, lastName, phoneNumber } = query;

  const where: any = {};
  if (id) where.id = id;
  if (email) where.email = ILike(`%${email}%`);
  if (firstName) where.firstName = ILike(`%${firstName}%`);
  if (lastName) where.lastName = ILike(`%${lastName}%`);
  if (phoneNumber) where.phoneNumber = ILike(`%${phoneNumber}%`);

  const users = await this.userRepository.find({
    where,
    select: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'profilePictureUrl'],
  });

  return users;
}
}
