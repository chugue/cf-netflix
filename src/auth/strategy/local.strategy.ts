import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-local';

export class LocalAuthGuard extends AuthGuard('codefactory') {}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'codefactory') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.authenticate(email, password);

    return user;
  }
}
