import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NestMiddleware,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request } from 'express';
import { envKeys } from 'src/common/const/env.const';

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            next();
            return;
        }
        const token = this.validateBearerToken(authHeader);

        const blockedToken = await this.cacheManager.get(`BLOCK_TOKEN_${token}`);

        if (blockedToken) {
            throw new UnauthorizedException('차단된 토큰입니다.');
        }

        const tokenKey = `TOKEN_${token}`;

        const cachePayload = await this.cacheManager.get(tokenKey);
        if (cachePayload) {
            console.log('---- cache run -----');
            req.user = cachePayload;
            return next();
        }

        const decodedPayload = this.jwtService.decode(token);

        if (decodedPayload.type !== 'refresh' && decodedPayload.type !== 'access') {
            throw new UnauthorizedException('토큰 포맷이 잘못되었습니다.');
        }

        try {
            const secretKey =
                decodedPayload.type === 'refresh'
                    ? envKeys.REFRESH_TOKEN_SECRET
                    : envKeys.ACCESS_TOKEN_SECRET;

            const payload = await this.jwtService.verifyAsync(token, {
                secret: secretKey,
            });

            // payload['exp'] -> epoch time seconds
            const expiryDate = +new Date(payload['exp'] * 1000);
            const now = +Date.now();

            const differenceInSeconds = expiryDate - now / 1000;

            await this.cacheManager.set(
                tokenKey,
                payload,
                Math.max((differenceInSeconds - 30) * 1000, 1),
            );

            req.user = payload;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('토큰이 만료되었습니다.');
            }

            next();
        }
    }

    validateBearerToken(rawToken: string) {
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        const [bearer, token] = basicSplit;

        if (bearer.toLocaleLowerCase() !== 'bearer') {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        return token;
    }
}
