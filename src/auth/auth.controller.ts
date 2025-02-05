import { Body, Controller, Post, Headers, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './strategy/local.strategy';
import { Public } from './decorator/public.decorator';
import { ApiBasicAuth, ApiBearerAuth } from '@nestjs/swagger';
import { Authorization } from './decorator/authorization.decorator';

@Controller('auth')
@ApiBearerAuth()
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @ApiBasicAuth()
    @Post('register')
    registerUser(@Authorization() token: string) {
        return this.authService.registerUser(token);
    }

    @Public()
    @ApiBasicAuth()
    @Post('login')
    loginUser(@Authorization() token: string) {
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

    // @UseGuards(JwtAuthGuard)
    // @Get('private')
    // getPrivate(@Request() req) {
    //     return req.user;
    // }
}
