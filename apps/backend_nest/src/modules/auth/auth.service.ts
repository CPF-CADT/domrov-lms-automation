import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRefreshToken } from '../../libs/entities/user/user-refresh-token.entity'
import { UserEmailOtp } from '../../libs/entities/user/user-email-otp.entity'
import { JwtService } from '@nestjs/jwt'
import { MailerService } from '@nestjs-modules/mailer'
import { Encryption } from '../../libs/utils/Encryption'
import { UserStatus } from '../../libs/enums/Status'
import { RegisterUserDTO } from '../../libs/dtos/user/register-user.dto'
import { LoginUserDTO } from '../../libs/dtos/user/login.dto'
import { SignUpResponseDto } from '../../libs/dtos/auth/sign-up-response.dto'
import { LoginResponseDto } from '../../libs/dtos/auth/login-response.dto'
import { RefreshTokenResponseDto } from '../../libs/dtos/auth/refresh-token-response.dto'
import { MessageResponseDto } from '../../libs/dtos/common/message-response.dto'
import { OAuthProfile } from '../../libs/dtos/auth/oauth-profile.interface'
import { UserService } from '../user/user.service'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,

        @InjectRepository(UserEmailOtp)
        private readonly userEmailOtpRepository: Repository<UserEmailOtp>,

        @InjectRepository(UserRefreshToken)
        private readonly userRefreshTokenRepository: Repository<UserRefreshToken>,

        private readonly accessJwtService: JwtService,
        private readonly refreshJwtService: JwtService,
        private readonly mailerService: MailerService,
    ) { }

    async signUp(signUpUserDto: RegisterUserDTO): Promise<SignUpResponseDto> {
        if (!signUpUserDto) throw new BadRequestException('Registration data is required')
        if (!signUpUserDto?.email || !signUpUserDto?.password)
          throw new BadRequestException('Email and password are required');
        const existingUser = await this.userService.findByEmail(
          signUpUserDto.email,
        );
        if (existingUser)
          throw new ConflictException('Email already registered');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(signUpUserDto.email))
          throw new BadRequestException('Invalid email format');
        if (!signUpUserDto?.firstName)
          throw new BadRequestException('First name is required');
        if (!signUpUserDto?.lastName)
          throw new BadRequestException('Last name is required');

        // Password strength validation
        if (signUpUserDto.password.length < 8)
          throw new BadRequestException(
            'Password must be at least 8 characters',
          );
        if (!/[A-Z]/.test(signUpUserDto.password))
          throw new BadRequestException('Password must contain uppercase');
        if (!/[0-9]/.test(signUpUserDto.password))
          throw new BadRequestException('Password must contain number/digit');
        if (
          !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signUpUserDto.password)
        )
          throw new BadRequestException(
            'Password must contain special character',
          );
        

        signUpUserDto.password = await Encryption.hashPassword(
          signUpUserDto.password,
        );
        const { confirmPassword, ...userData } = signUpUserDto
        const createdUser = await this.userService.create(userData)
        return {
            userId: createdUser.id,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            email: createdUser.email,
        }
    }

    async login(login: LoginUserDTO): Promise<LoginResponseDto> {
        if (!login?.email || !login?.password) throw new BadRequestException('Email and password are required')
        const user = await this.userService.findByEmail(login.email)
        if (!user) throw new UnauthorizedException('User not found with this email')
        const passwordMatches = await Encryption.verifyPassword(user.password, login.password)
        if (!passwordMatches) throw new UnauthorizedException('Password Incorrect Please Try Again')
        const payload = { sub: user.id, email: user.email ,role: user.role }
        const accessToken = await this.accessJwtService.signAsync(payload)
        const refreshToken = await this.refreshJwtService.signAsync(payload)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)
        await this.userRefreshTokenRepository.save({ user, refreshToken, expiresAt })
        return { accessToken, refreshToken }
    }

    async oauthLogin(user: Partial<OAuthProfile>): Promise<LoginResponseDto> {
        if (!user?.email) throw new BadRequestException('OAuth user must have an email');

        // Try to find existing user
        let existingUser = await this.userService.findByEmail(user.email);

        // If user doesn't exist, create a new one with random password
        if (!existingUser) {
            const randomPassword = Math.random().toString(36).slice(-12); // random string
            existingUser = await this.userService.create({
                firstName: user.firstName ?? 'OAuthUser',
                lastName: user.lastName ?? '',
                email: user.email,
                password: await Encryption.hashPassword(randomPassword),
                profilePictureUrl: user.avatar,
                status: UserStatus.ACTIVE,
                isVerified: true,
            });
        }

        // Generate JWT payload
        const payload = { sub: existingUser.id, email: existingUser.email, role: existingUser.role };
        const accessToken = await this.accessJwtService.signAsync(payload);
        const refreshToken = await this.refreshJwtService.signAsync(payload);

        // Save refresh token in DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.userRefreshTokenRepository.save({
            user: existingUser,
            refreshToken,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }

    async validateOAuthUser(profile: OAuthProfile) {
        return await this.userService.validateOAuthUser(profile)
    }

    async refreshToken(id: string, email: string): Promise<RefreshTokenResponseDto> {
        if (!id || !email) throw new BadRequestException('User ID and email are required')
        const accessToken = await this.refreshJwtService.signAsync({ sub: id, email })
        return { accessToken, status: 'success', issuedAt: Date.now() }
    }

    async logout(userId: number, refreshToken: string): Promise<MessageResponseDto> {
        if (!userId || !refreshToken) throw new BadRequestException('User ID and refresh token are required')
        const result = await this.userRefreshTokenRepository.delete({ user: { id: userId }, refreshToken })
        if (result.affected === 0) throw new NotFoundException('Session not found or already expired')
        return { message: 'Logged out successfully' }
    }

    async sendVerificationEmail(email: string): Promise<MessageResponseDto> {
        const user = await this.userService.findByEmail(email)
        if (!user) throw new NotFoundException('User with this email not found')
        if (user.isVerified) throw new BadRequestException('Email is already verified')
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + 10)
        let userOtp = await this.userEmailOtpRepository.findOne({ where: { user: { id: user.id } } })
        if (userOtp) {
            userOtp.otp = otp
            userOtp.expiresAt = expiresAt
        } else {
            userOtp = this.userEmailOtpRepository.create({ user, otp, expiresAt })
        }
        await this.userEmailOtpRepository.save(userOtp)
        await this.mailerService.sendMail({
            to: email,
            subject: 'Your Email Verification OTP',
            text: `Your OTP is: ${otp}`,
            html: `<p>Your OTP is: <b>${otp}</b></p>`,
        })
        return { message: 'Verification OTP sent successfully' }
    }

    async verifyEmailOtp(email: string, otp: string): Promise<MessageResponseDto> {
        const user = await this.userService.findByEmail(email)
        if (!user) throw new NotFoundException('User with this email not found')
        if (user.isVerified) throw new BadRequestException('Email is already verified')
        const userOtp = await this.userEmailOtpRepository.findOne({ where: { user: { id: user.id } } })
        if (!userOtp) throw new BadRequestException('No OTP found. Please request a new verification code.')
        if (userOtp.expiresAt < new Date()) {
            await this.userEmailOtpRepository.delete(userOtp.id)
            throw new BadRequestException('OTP has expired. Please request a new verification code.')
        }
        if (otp !== userOtp.otp) throw new BadRequestException('Invalid OTP. Please check and try again.')
        await this.userEmailOtpRepository.delete(userOtp.id)
        await this.userService.verifyUser(user.id);
        return { message: 'Email verified successfully' }
    }

    async validateGoogleUser(googleUser: Partial<RegisterUserDTO>) {
        if (!googleUser?.email) throw new BadRequestException('Google user email is required')
        return await this.userService.validateOAuthUser({
            provider: 'google',
            providerId: googleUser.email,
            email: googleUser.email,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.profilePictureUrl,
        })
    }
}