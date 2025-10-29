import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot(),
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get('SMTP_HOST'),
                    port: configService.get<number>('SMTP_PORT'),
                    secure: configService.get('SMTP_SECURE') === 'true', // true for 465, false for 587
                    auth: {
                        user: configService.get('SMTP_USER'),
                        pass: configService.get('SMTP_PASS'),
                    },
                },
                defaults: {
                    from: `"No Reply" <${configService.get('SMTP_FROM')}>`,
                },
            }),
            inject: [ConfigService],
        }),
    ],
})
export class MailModule { }
