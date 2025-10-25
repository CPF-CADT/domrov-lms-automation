import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../libs/entities/user.entity';
import { UserStatus } from '../libs/enums/Status';

@Injectable()
export class AppService {
  // constructor(
  //   @InjectRepository(User)
  //   private readonly userRepository: Repository<User>,
  // ) { }

  getHello(): string {
    // this.userRepository.save({
    //   firstName: 'Ronan',
    //   lastName: 'Nguyen',
    //   gender: 'Male',
    //   dob: new Date('1999-07-21'),
    //   phoneNumber: '+85512345678',
    //   email: 'ronan.nguyen@example.com',
    //   password: 'SecureP@ssw0rd!',
    //   profilePictureUrl: 'https://example.com/profile/ronan.jpg',
    //   isVerified: true,
    //   isTwoFactorEnable: false,
    //   status: UserStatus.ACTIVE,
    // })
    return 'Hello World!';
  }
}
