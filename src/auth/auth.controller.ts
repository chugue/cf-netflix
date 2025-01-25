import {
    Body,
    Controller,
    Post,
    Headers,
    UseGuards,
    Request,
    Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JwtAuthGuard } from './strategy/jwt.strategy';
import { Public } from './decorator/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    registerUser(@Headers('authorization') token: string) {
        return this.authService.registerUser(token);
    }

    @Public()
    @Post('login')
    loginUser(@Headers('authorization') token: string) {
        return this.authService.loginUser(token);
    }

    @Post('token/block')
    blockToken(@Body('token') token: string) {
        return this.authService.tokenBlock(token);
    }

    @Post('token/access')
    async rotateAccessToken(@Request() req) {
        return {
            accessToken: await this.authService.issueToken(req.user, false),
        };
    }

    @UseGuards(LocalAuthGuard)
    @Post('login/passport')
    async loginUserWithPassport(@Request() req) {
        return {
            refreshToken: await this.authService.issueToken(req.user, true),
            accessToken: await this.authService.issueToken(req.user, false),
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('private')
    getPrivate(@Request() req) {
        return req.user;
    }
}
