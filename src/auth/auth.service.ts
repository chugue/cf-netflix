import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { envKeys } from 'src/common/const/env.const';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { UserService } from 'src/user/user.service';
import { PrismaClient, Role, User } from '@prisma/client';
import { PrismaService } from 'src/common/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        // @InjectRepository(User) private userRepository: Repository<User>,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
        private readonly prisma: PrismaService,
    ) {}

    async tokenBlock(token: string) {
        const payload = this.jwtService.decode(token);

        // payload['exp'] -> epoch time seconds
        const expiryDate = +new Date(payload['exp'] * 1000);
        const now = +Date.now();

        const differenceInSeconds = expiryDate - now / 1000;

        await this.cacheManager.set(
            `BLOCK_TOKEN_${token}`,
            payload,
            Math.max(differenceInSeconds * 1000, 1),
        );

        return true;
    }

    // rawToken -> Basic $token
    async loginUser(rawToken: string) {
        const { email, password } = await this.parseBasicToken(rawToken);

        const user = await this.authenticate(email, password);

        return {
            refreshToken: await this.issueToken(user, true),
            accessToken: await this.issueToken(user, false),
        };
    }

    // rawToken -> Basic $token
    async registerUser(rawToken: string) {
        const { email, password } = await this.parseBasicToken(rawToken);
        return this.userService.create({
            email,
            password,
        });
    }

    /////////////////////////// 내부 기능 메소드 ///////////////////////////

    async parseBearerToken(rawToken: string, isRefreshToken: boolean) {
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        const [bearer, token] = basicSplit;

        if (bearer.toLocaleLowerCase() !== 'bearer') {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>(
                    isRefreshToken ? envKeys.REFRESH_TOKEN_SECRET : envKeys.ACCESS_TOKEN_SECRET,
                ),
            });

            if (isRefreshToken) {
                if (payload.type !== 'refresh') {
                    throw new BadRequestException('Refresh 토큰을 입력 해주세요');
                }
            } else {
                if (payload.type !== 'access') {
                    throw new BadRequestException('Access 토큰을 입력 해주세요');
                }
            }

            return payload;
        } catch (error) {
            throw new UnauthorizedException('토큰이 만료되었습니다.');
        }
    }

    async parseBasicToken(rawToken: string) {
        // 1. 토큰을 ' ' 기준으로 스플릿 한 후 토큰 값만 추출하기
        // ['Basic', $token]
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        const [basic, token] = basicSplit;

        if (basic.toLowerCase() !== 'basic') {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        // 2. 추출한 토큰을 base64 디코딩해서 이메일과 비밀번호로 나눈다.
        const decoded = Buffer.from(token, 'base64').toLocaleString('utf-8');

        // "email:password"
        // [email, password]
        const tokenSplit = decoded.split(':');

        if (tokenSplit.length !== 2) {
            throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
        }

        const [email, password] = tokenSplit;

        return { email, password };
    }

    async authenticate(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        // const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new NotFoundException('잘못된 로그인 정보입니다.');
        }

        const passOk = await bcrypt.compare(password, user.password);

        if (!passOk) {
            throw new BadRequestException('잘못된 로그인 정보입니다.');
        }

        return user;
    }

    async issueToken(user: { id: number; role: Role }, isRefreshToken: boolean) {
        const refreshTokenSecret = this.configService.get<string>(envKeys.REFRESH_TOKEN_SECRET);

        const accessTokenSecret = this.configService.get<string>(envKeys.ACCESS_TOKEN_SECRET);
        return await this.jwtService.signAsync(
            {
                sub: user.id,
                role: user.role,
                type: isRefreshToken ? 'refresh' : 'access',
            },
            {
                secret: isRefreshToken ? refreshTokenSecret : accessTokenSecret,
                expiresIn: isRefreshToken ? '24h' : 300,
            },
        );
    }
}
