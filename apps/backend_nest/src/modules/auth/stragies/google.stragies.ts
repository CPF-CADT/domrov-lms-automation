import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  type StrategyOptions,
} from 'passport-google-oauth20';
import googleOAuthConfig from '../../../config/google_oauth.config';
import type { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly googleConfiguration: ConfigType<typeof googleOAuthConfig>;

  constructor(
    @Inject(googleOAuthConfig.KEY)
    googleConfiguration: ConfigType<typeof googleOAuthConfig>,
    private readonly authService: AuthService,
  ) {

    console.log('GOOGLE CONFIG:', {
      clientID: googleConfiguration.clientID,
      callbackURL: googleConfiguration.callbackURL,
    });

    super({
      clientID: googleConfiguration.clientID,
      clientSecret: googleConfiguration.clientSecret,
      callbackURL: googleConfiguration.callbackURL,
      scope: ['email', 'profile'],
    } as StrategyOptions);

    this.googleConfiguration = googleConfiguration;
  }

     async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    console.log(' Google Strategy Validate called');
    console.log('Google profile:', profile?.emails?.[0]?.value);


    const googleUser = {
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      gender: profile.gender,
      profilePictureUrl: profile.photos?.[0]?.value,
    };

    console.log(' Passing to UserService:', googleUser);


    const user = await this.authService.validateGoogleUser(googleUser);

    console.log(' User saved or found:', user);

    done(null, user);
  }
}
