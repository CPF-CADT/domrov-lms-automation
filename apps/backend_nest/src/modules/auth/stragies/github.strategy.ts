import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';
import { OAuthProfile } from '../../../libs/dtos/auth/oauth-profile.interface';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private readonly authService: AuthService) {
        super({
            clientID: process.env.GIT_HUB_CLIENT_ID,
            clientSecret: process.env.GIT_HUB_CLIENT_SECRET,
            callbackURL: process.env.GIT_HUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
            scope: ['user:email'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any): Promise<OAuthProfile> {
        // Map GitHub profile to your interface
        const githubProfile: OAuthProfile = {
            provider: 'github',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            firstName: profile.displayName?.split(' ')[0],
            lastName: profile.displayName?.split(' ')[1] || '',
            avatar: profile.photos?.[0]?.value,
        };
        await this.authService.validateOAuthUser(githubProfile);     
        return githubProfile;
    }
}