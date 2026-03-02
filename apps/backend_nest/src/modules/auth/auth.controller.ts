import { Body, Controller, Post, Req, Res, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
    ApiTags,
    ApiOperation,
    ApiBody,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiBadRequestResponse,
    ApiUnauthorizedResponse,
    ApiNotFoundResponse,
    ApiConflictResponse,
    ApiInternalServerErrorResponse,
    ApiBearerAuth,
    ApiCookieAuth,
    ApiParam
} from '@nestjs/swagger';
import { RegisterUserDTO } from '../../libs/dtos/user/register-user.dto';
import { LoginUserDTO } from '../../libs/dtos/user/login.dto';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ResendOtpDTO, VerifyOtpDTO } from '../../libs/dtos/user/email-verification.dto';
import { SignUpResponseDto } from '../../libs/dtos/auth/sign-up-response.dto';
import { MessageResponseDto } from '../../libs/dtos/common/message-response.dto';
import { OAuthProfileDecorator, User as UserDecorator } from '../../common/decorators/user.decorator';
import { DynamicOAuthGuard, OAuthProvider } from '../../common/decorators/oauth.decorator';
import type { OAuthProfile } from '../../libs/dtos/auth/oauth-profile.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    // ==================== SIGN UP ====================
    @Post('sign-up')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Creates a new user account with the provided credentials. Email must be unique.'
    })
    @ApiBody({
        type: RegisterUserDTO,
        description: 'User registration details',
        examples: {
            example1: {
                summary: 'Standard registration',
                value: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    password: 'SecurePass123!',
                    confirmPassword: 'SecurePass123!',
                    gender: 'Male',
                    profilePictureUrl: 'https://example.com/avatar.jpg'
                }
            }
        }
    })
    @ApiCreatedResponse({
        schema: {
            example: {
                success: true,
                data: {
                    userId: 1,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com'
                }
            }
        }
    })
    @ApiConflictResponse({
        description: 'Email already registered',
        example: {
            statusCode: 409,
            message: 'Email already registered',
            error: 'Conflict'
        }
    })
    @ApiBadRequestResponse({
        description: 'Validation failed',
        example: {
            statusCode: 400,
            message: 'Validation failed. Please check your input.',
            error: 'Bad Request'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Failed to create user',
        example: {
            statusCode: 500,
            message: 'Failed to create user. Please try again later.',
            error: 'Internal Server Error'
        }
    })
    async signUp(@Body() createUserDto: RegisterUserDTO): Promise<{ success: true; data: SignUpResponseDto }> {
        const data = await this.authService.signUp(createUserDto);
        return { success: true, data };
    }

    // ==================== LOGIN ====================
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Login to the system',
        description: 'Authenticates user credentials and returns access token. Refresh token is set as HTTP-only cookie.'
    })
    @ApiBody({
        type: LoginUserDTO,
        description: 'User login credentials',
        examples: {
            example1: {
                summary: 'Teacher login',
                value: {
                    email: 'sophea.heng0@example.com',
                    password: 'password123'
                }
            },
            example2: {
                summary: 'Student login',
                value: {
                    email: 'vannak.chhun1@example.com',
                    password: 'password123'
                }
            },
            example3: {
                summary: 'Admin login',
                value: {
                    email: 'cpf.cadt@gmail.com',
                    password: 'Admin@123'
                }
            }

        }
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Invalid email or password',
        example: {
            statusCode: 401,
            message: 'Invalid email or password',
            error: 'Unauthorized'
        }
    })
    async login(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() loginDto: LoginUserDTO
    ): Promise<{ success: true; data: any }> {
        const { refreshToken, ...loginResponse } = await this.authService.login(loginDto);
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return { success: true, data: loginResponse };
    }

    // ==================== REFRESH TOKEN ====================
    @Post('refresh-token')
    @UseGuards(AuthGuard('refresh-jwt'))
    @HttpCode(HttpStatus.OK)
    @ApiCookieAuth('refresh_token')
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Issues a new access token using the refresh token from HTTP-only cookie.'
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    status: 'success',
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    issuedAt: 1704067200
                }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Invalid or expired refresh token',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    async refreshToken(@Req() req, @Res({ passthrough: true }) res: Response): Promise<{ success: true; data: any }> {
        const user = req.user;
        const { accessToken } = await this.authService.refreshToken(user.id, user.email);
        const issuedAt = Math.floor(Date.now() / 1000);
        const data = {
            status: 'success',
            accessToken,
            issuedAt
        };
        return { success: true, data };
    }

    // ==================== LOGOUT ====================
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Logout from current device',
        description: 'Invalidates the current refresh token and clears the HTTP-only cookie.'
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    status: 'success',
                    message: 'Logged out from current device'
                }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'User not authenticated',
        example: {
            statusCode: 401,
            message: 'Unauthorized',
            error: 'Unauthorized'
        }
    })
    @ApiNotFoundResponse({
        description: 'Session not found or already expired',
        example: {
            statusCode: 404,
            message: 'Session not found or already expired',
            error: 'Not Found'
        }
    })
    async logout(@Req() req, @Res({ passthrough: true }) res: Response): Promise<{ success: true; data: any }> {
        const user = req.user;
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) {
            throw new Error('Refresh token missing');
        }
        await this.authService.logout(user.id, refreshToken);
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        const data = { status: 'success', message: 'Logged out from current device' };
        return { success: true, data };
    }

    // ==================== VERIFY EMAIL ====================
    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verify user email with OTP',
        description: 'Verifies user email address using the OTP sent to their email.'
    })
    @ApiBody({
        type: VerifyOtpDTO,
        description: 'Email verification details',
        examples: {
            example1: {
                summary: 'Verify OTP',
                value: {
                    email: 'john.doe@example.com',
                    otp: '123456'
                }
            }
        }
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    message: 'Email verified successfully'
                }
            }
        }
    })
    @ApiNotFoundResponse({
        description: 'User not found',
        example: {
            statusCode: 404,
            message: 'User with this email not found',
            error: 'Not Found'
        }
    })
    @ApiBadRequestResponse({
        description: 'Invalid or expired OTP',
        examples: {
            alreadyVerified: {
                summary: 'Email already verified',
                value: {
                    statusCode: 400,
                    message: 'Email is already verified',
                    error: 'Bad Request'
                }
            },
            noOtp: {
                summary: 'No OTP found',
                value: {
                    statusCode: 400,
                    message: 'No OTP found. Please request a new verification code.',
                    error: 'Bad Request'
                }
            },
            expiredOtp: {
                summary: 'OTP expired',
                value: {
                    statusCode: 400,
                    message: 'OTP has expired. Please request a new verification code.',
                    error: 'Bad Request'
                }
            },
            invalidOtp: {
                summary: 'Invalid OTP',
                value: {
                    statusCode: 400,
                    message: 'Invalid OTP. Please check and try again.',
                    error: 'Bad Request'
                }
            }
        }
    })
    async verifyOtp(@Body() body: VerifyOtpDTO): Promise<{ success: true; data: MessageResponseDto }> {
        const data = await this.authService.verifyEmailOtp(body.email, body.otp);
        return { success: true, data };
    }

    // ==================== RESEND VERIFICATION OTP ====================
    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Resend OTP email for verification',
        description: 'Sends a new verification OTP to the user\'s email address.'
    })
    @ApiBody({
        type: ResendOtpDTO,
        description: 'Email address to resend OTP',
        examples: {
            example1: {
                summary: 'Resend OTP',
                value: {
                    email: 'john.doe@example.com'
                }
            }
        }
    })
    @ApiOkResponse({
        schema: {
            example: {
                success: true,
                data: {
                    message: 'Verification OTP sent successfully'
                }
            }
        }
    })
    @ApiNotFoundResponse({
        description: 'User not found',
        example: {
            statusCode: 404,
            message: 'User with this email not found',
            error: 'Not Found'
        }
    })
    @ApiBadRequestResponse({
        description: 'Email already verified',
        example: {
            statusCode: 400,
            message: 'Email is already verified',
            error: 'Bad Request'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Failed to send email',
        example: {
            statusCode: 500,
            message: 'Failed to send verification email. Please try again later.',
            error: 'Internal Server Error'
        }
    })
    async resendOtp(@Body() body: ResendOtpDTO): Promise<{ success: true; data: MessageResponseDto }> {
        const data = await this.authService.sendVerificationEmail(body.email);
        return { success: true, data };
    }

    // ==================== GOOGLE AUTH ====================
    @Get(':provider/login')
    @ApiOperation({ summary: 'Initiate OAuth login', description: 'Redirects to provider OAuth consent screen.' })
    @ApiParam({ name: 'provider', description: 'OAuth provider (google, microsoft, etc.)', required: true })
    @ApiOkResponse({ description: 'Redirects to OAuth provider consent screen' })
    @UseGuards(DynamicOAuthGuard)
    async oauthLogin(@OAuthProvider() provider: string) {
        console.log('Logging in with provider:', provider);
    }

    @Get(':provider/callback')
    @ApiOperation({ summary: 'OAuth callback', description: 'Handles OAuth provider callback and authenticates the user.' })
    @ApiParam({ name: 'provider', description: 'OAuth provider (google, microsoft, etc.)', required: true })
    @ApiOkResponse({ description: 'Login successful and sets accessToken cookie' })
    @ApiCookieAuth()
    @UseGuards(DynamicOAuthGuard)
    async oauthCallback(
        @OAuthProfileDecorator() profile: OAuthProfile,
        @Res() res: Response
    ) {
        const token = await this.authService.oauthLogin(profile);

        res.cookie('accessToken', token.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });

        console.log(`Logged in via provider: ${profile.provider}, email: ${profile.email}`);
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'OAUTH_SUCCESS', payload: { email: '${profile.email}' } }, 'http://localhost:5173');
                window.close();
            </script>
        `);
    }
}
