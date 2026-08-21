import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: { expiresIn: '20h' },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        {
            provide: 'ACCESS_JWT_SERVICE',
            useExisting: JwtService, // use the JwtService instance from this module
        },
    ],
    exports: ['ACCESS_JWT_SERVICE'],
})
export class AccessJwtConfigModule { }