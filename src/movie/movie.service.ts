import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { DataSource, In, Like, QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from 'src/common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { x } from 'joi';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class MovieService {
    constructor(
        @InjectRepository(Movie)
        private readonly movieRepository: Repository<Movie>,
        @InjectRepository(MovieDetail)
        private readonly movieDetailRepository: Repository<MovieDetail>,
        @InjectRepository(Director)
        private readonly directorRepository: Repository<Director>,
        @InjectRepository(Genre)
        private readonly genreRepository: Repository<Genre>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(MovieUserLike)
        private readonly movieUserLikeRepository: Repository<MovieUserLike>,
        private readonly dataSource: DataSource,
        private readonly commonService: CommonService,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async findRecent() {
        const cacheData = await this.cacheManager.get('MOVIE_RECENT');
        if (cacheData) {
            return cacheData;
        }

        const data = await this.movieRepository.find({
            order: {
                createdAt: 'DESC',
            },
            take: 10,
        });
        await this.cacheManager.set('MOVIE_RECENT', data);

        return data;
    }

    async findAll(dto: GetMoviesDto, userId?: number) {
        const { title } = dto;

        const qb = await this.getMovies();

        if (title) {
            qb.where('movie.title LIKE :title', { title: `%${title}%` });
        }

        // this.commonService.applyPagePaginationParamsToQb(qb, dto);
        const { nextCursor } = await this.commonService.applyCursorPaginationParamsToQb(qb, dto);

        let [data, count] = await qb.getManyAndCount();

        if (userId) {
            const movieIds = data.map((movie) => movie.id);

            const likedMovies =
                movieIds.length < 1 ? [] : await this.getLikedMovies(movieIds, userId);

            /**
             * {
             *  movieId: boolean
             * }
             */
            const likedMovieMap = likedMovies.reduce(
                (acc, next) => ({
                    ...acc,
                    [next.movie.id]: next.isLike,
                }),
                {},
            );

            data = data.map((x) => ({
                ...x,
                // null || true || false
                likeStatus: x.id in likedMovieMap ? likedMovieMap[x.id] : null,
            }));
        }

        return { data, nextCursor, count };
    }

    async findOne(id: number) {
        const movie = await this.findMovieDetailById(id);

        // const movie = await this.movieRepository.findOne({
        //   where: { id },
        //   relations: ['detail', 'director', 'genres'],
        // });

        if (!movie) {
            throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
        }

        return movie;
    }

    async create(createMovieDto: CreateMovieDto, userId: number, qr: QueryRunner) {
        const director = await qr.manager.findOne(Director, {
            where: { id: createMovieDto.directorId },
        });

        if (!director) {
            throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
        }

        const genres = await qr.manager.find(Genre, {
            where: { id: In(createMovieDto.genreIds) },
        });

        if (genres.length !== createMovieDto.genreIds.length) {
            throw new NotFoundException(
                `존재하지 않는 장르가 있습니다! 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`,
            );
        }

        const movieDetail = await this.createMovieDetail(qr, createMovieDto);

        const movieDetailId = movieDetail.identifiers[0].id;

        const movieFolder = join('public', 'movie');
        const tempFolder = join('public', 'temp');

        const movie = await this.createMovie(
            qr,
            createMovieDto,
            movieDetailId,
            director,
            userId,
            genres,
            movieFolder,
        );

        const movieId = movie.identifiers[0].id;

        await this.renameMovieFile(tempFolder, movieFolder, createMovieDto);

        await this.createMovieGenreRelation(qr, movieId, genres);

        return qr.manager.findOne(Movie, {
            where: { id: movieId },
            relations: ['detail', 'director', 'genres'],
        });
    }

    async update(id: number, updateMovieDto: UpdateMovieDto) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            const movie = await qr.manager.findOne(Movie, {
                where: { id },
                relations: ['detail', 'genres'],
            });

            if (!movie) {
                throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
            }

            const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

            let newDirector: Director;

            if (directorId) {
                const director = await qr.manager.findOne(Director, {
                    where: { id: directorId },
                });

                if (!director) {
                    throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
                }

                newDirector = director;
            }

            let newGenres;

            if (genreIds) {
                const genres = await qr.manager.find(Genre, {
                    where: { id: In(genreIds) },
                });

                if (genres.length !== updateMovieDto.genreIds.length) {
                    throw new NotFoundException(
                        `존재하지 않는 장르가 있습니다! 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`,
                    );
                }

                newGenres = genres;
            }

            const movieUpdateFields = {
                ...movieRest,
                ...(newDirector && { director: newDirector }), //조건부 스프레드 문법
            };

            await this.updateMovie(qr, movieUpdateFields, id);

            if (detail) {
                await this.updateMovieDetail(qr, detail, movie);
            }

            if (newGenres) {
                await this.updateMovieGenreRelation(qr, id, newGenres, movie);
            }

            await qr.commitTransaction();

            return this.movieRepository.findOne({
                where: { id },
                relations: ['detail', 'director', 'genres'],
            });
        } catch (error) {
            await qr.rollbackTransaction();
            throw error;
        } finally {
            await qr.release();
        }
    }

    async remove(id: number) {
        const movie = await this.movieRepository.findOne({
            where: { id },
            relations: ['detail'],
        });

        if (!movie) {
            throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
        }

        await this.deleteMovie(id);

        // await this.movieRepository.delete({ id });
        await this.movieDetailRepository.delete(movie.detail.id);
        return id;
    }

    async toggleMovieLike(movieId: number, userId: number, isLike: boolean) {
        const movie = await this.movieRepository.findOne({
            where: { id: movieId },
        });

        if (!movie) {
            throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
        }
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('존재하지 않는 아이디의 유저입니다.');
        }

        const likeRecord = await this.getLikedRecord(movieId, userId);

        if (likeRecord) {
            if (isLike === likeRecord.isLike) {
                await this.movieUserLikeRepository.delete({
                    movie,
                    user,
                });
            } else {
                await this.movieUserLikeRepository.update(
                    {
                        movie,
                        user,
                    },
                    {
                        isLike,
                    },
                );
            }
        } else {
            await this.movieUserLikeRepository.save({
                movie,
                user,
                isLike,
            });
        }

        const result = await this.getLikedRecord(movieId, userId);

        return {
            isLike: result ? result.isLike : null,
        };
    }

    //////////////////////////////////////////////// 내부 기능 메소드 ////////////////////////////////////////////////
    //////////////////////////////////////////////// 내부 기능 메소드 ////////////////////////////////////////////////

    /* istanbul ignore next */
    async getMovies() {
        return this.movieRepository
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.director', 'director')
            .leftJoinAndSelect('movie.genres', 'genres');
    }

    /* istanbul ignore next */
    async getLikedMovies(movieIds: number[], userId: number) {
        return await this.movieUserLikeRepository
            .createQueryBuilder('mul')
            .leftJoinAndSelect('mul.user', 'user')
            .leftJoinAndSelect('mul.movie', 'movie')
            .where('movie.id In(:...movieIds)', { movieIds })
            .andWhere('user.id = :userId', { userId })
            .getMany();
    }

    /* istanbul ignore next */
    async findMovieDetailById(id: number) {
        return await this.movieRepository
            .createQueryBuilder('movie')
            .leftJoinAndSelect('movie.director', 'director')
            .leftJoinAndSelect('movie.genres', 'genres')
            .leftJoinAndSelect('movie.detail', 'detail')
            .leftJoinAndSelect('movie.creator', 'creator')
            .where('movie.id = :id', { id })
            .getOne();
    }

    /* istanbul ignore next */
    async createMovieDetail(qr: QueryRunner, createMovieDto: CreateMovieDto) {
        return await qr.manager
            .createQueryBuilder()
            .insert()
            .into(MovieDetail)
            .values({
                detail: createMovieDto.detail,
            })
            .execute();
    }

    /* istanbul ignore next */
    async createMovie(
        qr: QueryRunner,
        createMovieDto: CreateMovieDto,
        movieDetailId: number,
        director: Director,
        userId: number,
        genres: Genre[],
        movieFolder: string,
    ) {
        return await qr.manager
            .createQueryBuilder()
            .insert()
            .into(Movie)
            .values({
                title: createMovieDto.title,
                detail: {
                    id: movieDetailId,
                },
                director,
                creator: {
                    id: userId,
                },
                genres,
                movieFilePath: join(movieFolder, createMovieDto.movieFileName),
            })
            .execute();
    }

    /* istanbul ignore next */
    async createMovieGenreRelation(qr: QueryRunner, movieId: number, genres: Genre[]) {
        return await qr.manager
            .createQueryBuilder()
            .relation(Movie, 'genres')
            .of(movieId)
            .add(genres.map((genre) => genre.id));
    }

    /* istanbul ignore next */
    async renameMovieFile(tempFolder: string, movieFolder: string, createMovieDto: CreateMovieDto) {
        console.log(process.env.ENV);
        if (process.env.ENV !== 'prod') {
            return await rename(
                join(process.cwd(), tempFolder, createMovieDto.movieFileName),
                join(process.cwd(), movieFolder, createMovieDto.movieFileName),
            );
        } else {
            return this.commonService.saveMovieToPermanentStorage(createMovieDto.movieFileName);
        }
    }

    /* istanbul ignore next */
    async updateMovie(qr: QueryRunner, movieUpdateFields: any, id: number) {
        return await qr.manager
            .createQueryBuilder()
            .update(Movie)
            .set(movieUpdateFields)
            .where('id = :id', { id })
            .execute();
    }

    /* istanbul ignore next */
    async updateMovieDetail(qr: QueryRunner, detail: string, movie: Movie) {
        return await qr.manager
            .createQueryBuilder()
            .update(MovieDetail)
            .set({
                detail,
            })
            .where('id = :id', { id: movie.detail.id })
            .execute();
    }

    /* istanbul ignore next */
    async updateMovieGenreRelation(qr: QueryRunner, id: number, newGenres: Genre[], movie: Movie) {
        return await qr.manager
            .createQueryBuilder()
            .relation(Movie, 'genres')
            .of(id)
            .addAndRemove(
                newGenres.map((genre) => genre.id),
                movie.genres.map((genre) => genre.id),
            );
    }

    /* istanbul ignore next */
    async deleteMovie(id: number) {
        return await this.movieRepository
            .createQueryBuilder()
            .delete()
            .from(Movie)
            .where('id = :id', { id })
            .execute();
    }

    /* istanbul ignore next */
    async getLikedRecord(movieId: number, userId: number) {
        return await this.movieUserLikeRepository
            .createQueryBuilder('mul')
            .leftJoinAndSelect('mul.movie', 'movie')
            .leftJoinAndSelect('mul.user', 'user')
            .where('movie.id = :movieId', { movieId })
            .andWhere('user.id = :userId', { userId })
            .getOne();
    }
}
