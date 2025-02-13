import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MovieModule } from './movie/movie.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { Movie } from './movie/entity/movie.entity';
import { MovieDetail } from './movie/entity/movie-detail.entity';
import { DirectorModule } from './director/director.module';
import { Director } from './director/entity/director.entity';
import { GenreModule } from './genre/genre.module';
import { Genre } from './genre/entities/genre.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { envKeys } from './common/const/env.const';
import { BearerTokenMiddleware } from './auth/middleware/bearer-token.middleware';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { RBACGuard } from './auth/guard/rbac.guard';
import { CommonModule } from './common/common.module';
import { ResponseTimeInterceptor } from './common/interceptor/response-time.interceptor';
import { ForbiddenExceptionFilter } from './common/fliter/forbidden.filter';
import { QueryFailedExceptionFilter } from './common/fliter/query-failed.filter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MovieUserLike } from './movie/entity/movie-user-like.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottleInterceptor } from './common/interceptor/throttle.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
            validationSchema: Joi.object({
                ENV: Joi.string().valid('test', 'dev', 'prod').required(),
                DB_TYPE: Joi.string().valid('postgres').required(),
                DB_HOST: Joi.string().required(),
                DB_PORT: Joi.number().required(),
                DB_USERNAME: Joi.string().required(),
                DB_PASSWORD: Joi.string().required(),
                DB_DATABASE: Joi.string().required(),
                HASH_ROUNDS: Joi.number().required(),
                ACCESS_TOKEN_SECRET: Joi.string().required(),
                REFRESH_TOKEN_SECRET: Joi.string().required(),
            }),
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: configService.get<string>(envKeys.DB_TYPE) as 'postgres',
                host: configService.get<string>(envKeys.DB_HOST),
                port: configService.get<number>(envKeys.DB_PORT),
                username: configService.get<string>(envKeys.DB_USERNAME),
                password: configService.get<string>(envKeys.DB_PASSWORD),
                database: configService.get<string>(envKeys.DB_DATABASE),
                entities: [Movie, MovieDetail, Director, Genre, User, MovieUserLike],
                synchronize: true,
                ssl: {
                    rejectUnauthorized: false,
                },
            }),
        }),
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'public'),
            serveRoot: '/public/',
        }),
        MovieModule,
        DirectorModule,
        GenreModule,
        AuthModule,
        UserModule,
        CommonModule,
        CacheModule.register({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        WinstonModule.forRoot({
            level: 'debug',
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize({
                            all: true,
                        }),
                        winston.format.timestamp(),
                        winston.format.printf(
                            (info) =>
                                `${info.timestamp} -[${info.context}] - ${info.level} - ${info.message}`,
                        ),
                    ),
                }),
                new winston.transports.File({
                    dirname: join(process.cwd(), 'logs'),
                    filename: 'logs.log',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.printf(
                            (info) =>
                                `${info.timestamp} [${info.context}] ${info.level} - ${info.message}`,
                        ),
                    ),
                }),
            ],
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RBACGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseTimeInterceptor,
        },
        {
            provide: APP_FILTER,
            useClass: QueryFailedExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ThrottleInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(BearerTokenMiddleware)
            .exclude(
                {
                    path: 'auth/register',
                    method: RequestMethod.POST,
                },
                {
                    path: 'auth/login',
                    method: RequestMethod.POST,
                },
            )
            .forRoutes('*');
    }
}
