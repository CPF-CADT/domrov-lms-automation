import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../libs/entities/user.entity';
import { RegisterUserDTO } from '../../../libs/dtos/register-user.dto';
import { Encryption } from '../../../libs/utils/Encryption';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDTO } from '../../../libs/dtos/login.dto';
import { UserRefreshToken } from '../../../libs/entities/user-refresh-token.entity';
import { UserEmailOtp } from '../../../libs/entities/user-email-otp.entity';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(UserEmailOtp)
        private readonly userEmailOtpRepository: Repository<UserEmailOtp>,

        @InjectRepository(UserRefreshToken)
        private readonly userRefreshTokenRepository: Repository<UserRefreshToken>,

        private readonly accessJwtService: JwtService,

        private readonly refreshJwtService: JwtService,

        private readonly mailerService: MailerService,

    ) { }

    async signUp(signUpUserDto: RegisterUserDTO) {
        signUpUserDto.password = await Encryption.hashPassword(signUpUserDto.password);
        const { confirmPassword, ...userData } = signUpUserDto;
        try {
            const createdUser = await this.userRepository.save(userData);
            return {
                userId: createdUser.id,
                firstName: createdUser.firstName,
                lastName: createdUser.lastName,
                email: createdUser.email
            };
        } catch (error) {
            if (error.code === 11000) {
                throw new BadRequestException(`Duplicate field : ${Object.keys(error.keyValue).join(', ')}`);
            } else if (error.name === 'ValidationError') {
                throw new BadRequestException(`Validation Fail : ${Object.keys(error.keyValue).join(', ')}`);
            } else {
                throw new InternalServerErrorException("Cannot Save data to DB.!" + error.message);
            }
        }
    }

    async login(login: LoginUserDTO) {
        const user = await this.userRepository.findOne({ where: { email: login.email } });
        if (!user) throw new NotFoundException('Email not found');
        const passwordMatches = await Encryption.verifyPassword(user.password, login.password);
        if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.accessJwtService.sign(payload);
        const refreshToken = this.refreshJwtService.sign(payload);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.userRefreshTokenRepository.save({
            user,
            refreshToken: refreshToken,
            expiresAt: expiresAt
        });

        return { accessToken, refreshToken };
    }

    async refreshToken(id: string, email: string) {
        return await this.refreshJwtService.signAsync({ sub: id, email: email })
    }

    async logout(userId: number, refreshToken: string) {
        const result = await this.userRefreshTokenRepository.delete({
            user: { id: userId },
            refreshToken: refreshToken,
        });

        if (result.affected === 0) {
            throw new NotFoundException('Refresh token not found or already invalidated');
        }

        return { message: 'Logged out from current device successfully' };
    }

    async sendVerificationEmail(email: string) {
        // const user = await this.userRepository.findOne({ where: { email } });
        // if (!user) throw new Error('User not found');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // let userOtp = await this.userEmailOtpRepository.findOne({
        //     where: { user: { id: user.id } },
        // });

        // if (userOtp) {
        //     userOtp.otp = otp;
        //     userOtp.expiresAt = expiresAt;
        // } else {
        //     userOtp = this.userEmailOtpRepository.create({
        //         user,
        //         otp,
        //         expiresAt,
        //     });
        // }

        await this.mailerService.sendMail({
            to: email,
            subject: 'Your Email Verification OTP',
            text: `Your OTP is: ${otp}`,
            html: `<p>Your OTP is: <b>${otp}</b></p>`,
        });

        return true;
    }


    async verifyEmailOtp(email: string, otp: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) return false;

        const userOtp = await this.userEmailOtpRepository.findOne({
            where: { user: { id: user.id } },
        });

        if (!userOtp) return false;

        if (userOtp.expiresAt < new Date()) return false;

        const isMatch = otp === userOtp.otp;
        if (!isMatch) return false;

        await this.userEmailOtpRepository.delete(userOtp.id);

        await this.userRepository.update(user.id, { isVerified: true });

        return true;
    }




}
