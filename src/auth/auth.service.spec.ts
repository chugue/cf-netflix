import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { Role, User } from 'src/user/entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { NotFoundError } from 'rxjs';

const mockUserRepository = {
    findOne: jest.fn(),
};

const mockConfigService = {
    get: jest.fn(),
};

const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
};

const mockCacheManager = {
    set: jest.fn(),
};

const mockUserService = {
    create: jest.fn(),
};

describe('AuthService', () => {
    let authService: AuthService;
    let userRepository: Repository<User>;
    let configService: ConfigService;
    let jwtService: JwtService;
    let cacheManager: Cache;
    let userService: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        configService = module.get<ConfigService>(ConfigService);
        jwtService = module.get<JwtService>(JwtService);
        cacheManager = module.get<Cache>(CACHE_MANAGER);
        userService = module.get<UserService>(UserService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(authService).toBeDefined();
    });

    describe('tokenBlock', () => {
        it('should block a token', async () => {
            const token = 'testToken';
            const payload = {
                exp: Math.floor(Date.now() / 1000) + 60,
            };

            jest.spyOn(jwtService, 'decode').mockReturnValue(payload);

            await authService.tokenBlock(token);
            expect(jwtService.decode).toHaveBeenCalledWith(token);
            expect(cacheManager.set).toHaveBeenCalledWith(
                `BLOCK_TOKEN_${token}`,
                payload,
                expect.any(Number),
            );
        });
    });

    describe('parseBasicToken', () => {
        it('should parse a valid Basic token', async () => {
            const email = 'test@example.com';
            const password = '123456';
            const base64 = Buffer.from(`${email}:${password}`).toString('base64');
            const rawToken = `Basic ${base64}`;

            const result = await authService.parseBasicToken(rawToken);
            const decode = { email, password };
            expect(result).toEqual(decode);
        });

        it('should throw an error for invalid token format', () => {
            const rawToken = 'InvalidTokenFormat';
            expect(authService.parseBasicToken(rawToken)).rejects.toThrow(BadRequestException);
        });

        it('should throw an error for invalid Basic token format', () => {
            const rawToken = 'Bearer InvalidTokenFormat';
            expect(authService.parseBasicToken(rawToken)).rejects.toThrow(BadRequestException);
        });

        it('should throw an error for invalid Basic token format', () => {
            const rawToken = 'Basic a';
            expect(authService.parseBasicToken(rawToken)).rejects.toThrow(BadRequestException);
        });
    });

    describe('parseBearerToken', () => {
        it('should parse a valid Bearer token', async () => {
            const rawToken = 'Bearer token';
            const payload = { type: 'access' };
            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);
            jest.spyOn(mockConfigService, 'get').mockReturnValue('secret');

            const result = await authService.parseBearerToken(rawToken, false);
            expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
                secret: 'secret',
            });
            expect(result).toEqual(payload);
        });

        it('shoud throw an BadRequestException for invalid Bearer token format', () => {
            const rawToken = 'a';
            expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw an BadRequestException for token not starting with Bearer', () => {
            const rawToken = 'Basic a';
            expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw an BadRequestException if payload.type is not refresh but isRefreshToken is true', () => {
            const rawToken = 'Bearer a';
            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
                type: 'refresh',
            });

            expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw an BadRequestException if payload.type is not refresh but isRefreshToken is true', () => {
            const rawToken = 'Bearer a';
            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
                type: 'access',
            });

            expect(authService.parseBearerToken(rawToken, true)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });

    describe('register', () => {
        it('should register a new user', async () => {
            const rawToken = 'basic abcd';
            const user = {
                email: 'test@codefactory.ai',
                password: '123123',
            };
            jest.spyOn(authService, 'parseBasicToken').mockResolvedValue(user);
            jest.spyOn(mockUserService, 'create').mockResolvedValue(user);

            const result = await authService.registerUser(rawToken);
            expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
            expect(userService.create).toHaveBeenCalledWith(user);
            expect(result).toEqual(user);
        });
    });

    describe('authenticate', () => {
        it('should authenticate a user with correct credentials', async () => {
            const email = 'test@codefactory.ai';
            const password = '123123';
            const hashedPassword = 'hashedpassword';
            const user = {
                email,
                password: hashedPassword,
            };

            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
            jest.spyOn(bcrypt, 'compare').mockImplementation(() => true);

            const result = await authService.authenticate(email, password);

            expect(userRepository.findOne).toHaveBeenCalledWith({
                where: { email },
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toEqual(user);
        });

        it('should throw an Error for not existing user', () => {
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);
            expect(authService.authenticate('test@example.com', 'password')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should thorw an error for incorrect password', async () => {
            const user = {
                email: 'test@codefactory.ai',
                password: 'hashedPassword',
            };
            jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);

            jest.spyOn(bcrypt, 'compare').mockImplementation(() => false);
            await expect(
                authService.authenticate('test@codefactory.ai', 'password'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('issueToken', () => {
        const user = {
            id: 1,
            role: Role.USER,
        };
        const token = 'token';

        beforeEach(() => {
            jest.spyOn(mockConfigService, 'get').mockReturnValue('secret');
            jest.spyOn(jwtService, 'signAsync').mockResolvedValue(token);
        });

        it('should issue an access token', async () => {
            const result = await authService.issueToken(user as User, false);

            expect(jwtService.signAsync).toHaveBeenCalledWith(
                {
                    sub: user.id,
                    type: 'access',
                    role: user.role,
                },
                {
                    secret: 'secret',
                    expiresIn: 300,
                },
            );
            expect(result).toBe(token);
        });
        it('should issue an access token', async () => {
            const result = await authService.issueToken(user as User, true);

            expect(jwtService.signAsync).toHaveBeenCalledWith(
                {
                    sub: user.id,
                    type: 'refresh',
                    role: user.role,
                },
                {
                    secret: 'secret',
                    expiresIn: '24h',
                },
            );
            expect(result).toBe(token);
        });
    });

    describe('login', () => {
        it('should login a user and return tokens', async () => {
            const rawToken = 'Basic asdf';
            const email = 'test@codefactory.ai';
            const password = '123123';
            const user = { id: 1, role: Role.USER };

            jest.spyOn(authService, 'parseBasicToken').mockResolvedValue({
                email,
                password,
            });
            jest.spyOn(authService, 'authenticate').mockResolvedValue(user as User);
            jest.spyOn(authService, 'issueToken').mockResolvedValue('mocked.token');

            const result = await authService.loginUser(rawToken);
            expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
            expect(authService.authenticate).toHaveBeenCalledWith(email, password);
            expect(authService.issueToken).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                refreshToken: 'mocked.token',
                accessToken: 'mocked.token',
            });
        });
    });
});
