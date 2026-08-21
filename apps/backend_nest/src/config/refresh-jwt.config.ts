import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_REFRESH_TOKEN_SECRET'),
                signOptions: { expiresIn: '7d' },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        {
            provide: 'REFRESH_JWT_SERVICE',
            useExisting: JwtService,
        },
    ],
    exports: ['REFRESH_JWT_SERVICE'],
})
export class RefreshJwtConfigModule { }