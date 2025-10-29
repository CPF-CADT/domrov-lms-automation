import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_REFRESH_TOKEN_SECRET'),
                signOptions: {
                    expiresIn: configService.get('JWT_REFRESH_TOKEN_EXPIRE'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [JwtModule],
})
export class RefreshJwtConfigModule { }
