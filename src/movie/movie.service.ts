import {
	Inject,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { DataSource, In, Like, QueryRunner, Repository } from 'typeorm';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from 'src/common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from 'src/common/prisma.service';
import { Prisma } from '@prisma/client';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Movie } from './schema/movie.schema';
import { MovieDetail } from './schema/movie-detail.schema';
import { Director } from 'src/director/schema/director.schema';
import { Genre } from 'src/genre/schema/genre.schema';
import { User } from 'src/user/schema/user.schema';
import { MovieUserLike } from './schema/movie-user-like.schema';

@Injectable()
export class MovieService {
	constructor(
		// @InjectRepository(Movie)
		// private readonly movieRepository: Repository<Movie>,
		// @InjectRepository(MovieDetail)
		// private readonly movieDetailRepository: Repository<MovieDetail>,
		// @InjectRepository(Director)
		// private readonly directorRepository: Repository<Director>,
		// @InjectRepository(Genre)
		// private readonly genreRepository: Repository<Genre>,
		// @InjectRepository(User)
		// private readonly userRepository: Repository<User>,
		// @InjectRepository(MovieUserLike)
		// private readonly movieUserLikeRepository: Repository<MovieUserLike>,
		@InjectModel(Movie.name)
		private readonly movieModel: Model<Movie>,
		@InjectModel(MovieDetail.name)
		private readonly movieDetailModel: Model<MovieDetail>,
		@InjectModel(Director.name)
		private readonly directorModel: Model<Director>,
		@InjectModel(Genre.name)
		private readonly genreModel: Model<Genre>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(MovieUserLike.name)
		private readonly movieUserLikeModel: Model<MovieUserLike>,
		// private readonly prisma: PrismaService,
		// private readonly dataSource: DataSource,
		private readonly commonService: CommonService,
		@Inject(CACHE_MANAGER)
		private readonly cacheManager: Cache,
	) {}

	async findRecent() {
		const cacheData = await this.cacheManager.get('MOVIE_RECENT');

		if (cacheData) {
			return cacheData;
		}

		const data = await this.movieModel
			.find()
			.populate({ path: 'genres', model: 'Genre' })
			.sort({ createdAt: -1 })
			.limit(10)
			.exec();

		// const data = await this.prisma.movie.findMany({
		// 	orderBy: {
		// 		createdAt: 'desc',
		// 	},
		// 	take: 10,
		// });
		// const data = await this.movieRepository.find({
		//     order: {
		//         createdAt: 'DESC',
		//     },
		//     take: 10,
		// });

		await this.cacheManager.set('MOVIE_RECENT', data);

		return data;
	}

	async findAll(dto: GetMoviesDto, userId?: number) {
		const { title, cursor, take, order } = dto;

		const orderBy = order.reduce((acc, field) => {
			const [column, direction] = field.split('_');
			if (column === 'id') {
				acc['_id'] = direction.toLowerCase();
			} else {
				acc[column] = direction.toLowerCase();
			}
			return acc;
		}, {});

		// const orderBy = order.map((field) => {
		// 	const [column, direction] = field.split('_');

		// 	return {
		// 		[column]: direction.toLocaleLowerCase(),
		// 	};
		// });

		const query = this.movieModel
			.find(
				title
					? {
							title: {
								$regex: title,
							},
							$option: 'i',
						}
					: {},
			)
			.sort(orderBy)
			.limit(take + 1);

		if (cursor) {
			query.lt('_id', new Types.ObjectId(cursor));
		}

		const movies = await query.populate('genres director').exec();
		// const movies = await query.exec();

		const hasNextPage = movies.length > take;

		if (hasNextPage) movies.pop();

		const nextCursor = hasNextPage ? movies[movies.length - 1]._id.toString() : null;

		// const movies = await this.prisma.movie.findMany({
		// 	where: title ? { title: { contains: title } } : {},
		// 	cursor: cursor ? { id: parseInt(cursor) } : undefined,
		// 	take: take + 1,
		// 	skip: cursor ? 1 : 0,
		// 	orderBy,
		// 	include: {
		// 		genres: true,
		// 		director: true,
		// 	},
		// });

		// const hasNextPage = movies.length > take;

		// const qb = await this.getMovies();

		// if (title) {
		//     qb.where('movie.title LIKE :title', { title: `%${title}%` });
		// }

		// this.commonService.applyPagePaginationParamsToQb(qb, dto);
		// const { nextCursor } = await this.commonService.applyCursorPaginationParamsToQb(qb, dto);
		// let [data, count] = await qb.getManyAndCount();

		if (userId) {
			const movieIds = movies.map((movie) => movie._id);
			// const movieIds = data.map((movie) => movie.id);

			const likedMovies =
				movieIds.length < 1
					? []
					: await this.movieUserLikeModel
							.find({
								movie: {
									$in: movieIds.map((id) => new Types.ObjectId(id.toString())),
								},
								user: new Types.ObjectId(userId.toString()),
							})
							.populate('movie')
							.exec();
			// const likedMovies =
			// 	movieIds.length < 1
			// 		? []
			// 		: await this.prisma.movieUserLike.findMany({
			// 				where: {
			// 					movieId: { in: movieIds },
			// 					userId: userId,
			// 				},
			// 				include: {
			// 					movie: true,
			// 				},
			// 			});

			// const likedMovies =
			//     movieIds.length < 1 ? [] : await this.getLikedMovies(movieIds, userId);

			/**
			 * {
			 *  movieId: boolean
			 * }
			 */
			const likedMovieMap = likedMovies.reduce(
				(acc, next) => ({
					...acc,
					[next.movie._id.toString()]: next.isLike,
				}),
				{},
			);

			// data = data.map((x) => ({
			//     ...x,
			//     // null || true || false
			//     likeStatus: x.id in likedMovieMap ? likedMovieMap[x.id] : null,
			// }));

			return {
				data: movies.map((movie) => ({
					...movie.toObject(),
					likeStatus: movie._id.toString() in likedMovieMap ? likedMovieMap[movie._id.toString()] : null,
				})) as (Document<unknown, {}, Movie> &
					Movie &
					Required<{
						_id: unknown;
					}> & {
						__v?: number;
					} & {
						likeStatus: Boolean;
					})[],
				nextCursor,
				hasNext: hasNextPage,
			};
		}

		return { data: movies, nextCursor, hasNext: hasNextPage };
	}

	async findOne(id: string) {
		const movie = await this.movieModel.findById(id);
		// const movie = await this.prisma.movie.findUnique({
		// 	where: {
		// 		id,
		// 	},
		// });
		// const movie = await this.findMovieDetailById(id);

		// const movie = await this.movieRepository.findOne({
		//   where: { id },
		//   relations: ['detail', 'director', 'genres'],
		// });

		if (!movie) {
			throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		}

		return movie;
	}

	async create(createMovieDto: CreateMovieDto, userId: number) {
		const session = await this.movieModel.startSession();
		session.startTransaction();

		try {
			const director = await this.directorModel.findById(createMovieDto.directorId).exec();
			if (!director) {
				throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
			}
			const genres = await this.genreModel.find({ _id: { $in: createMovieDto.genreIds } }).exec();

			if (genres.length !== createMovieDto.genreIds.length) {
				throw new NotFoundException(
					`존재하지 않는 장르가 있습니다. 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`,
				);
			}

			const movieDetail = await this.movieDetailModel.create(
				[
					{
						detail: createMovieDto.detail,
					},
				],
				{
					session,
				},
			);

			const movie = await this.movieModel.create(
				[
					{
						title: createMovieDto.title,
						movieFilePath: createMovieDto.movieFileName,
						creator: userId,
						director: director._id,
						genres: genres.map((genre) => genre._id),
						detail: movieDetail[0]._id,
					},
				],
				{
					session,
				},
			);

			// MovieDetail의 movie 필드 업데이트
			await this.movieDetailModel.findByIdAndUpdate(movieDetail[0]._id, { movie: movie[0]._id }, { session });

			await session.commitTransaction();

			return this.movieModel
				.findById(movie[0]._id)
				.populate({
					path: 'genres',
					model: 'Genre',
				})
				.populate('director')
				.populate('detail')
				.exec();
		} catch (e) {
			console.log(e);
			await session.abortTransaction();
			throw new InternalServerErrorException('영화 생성 중 오류가 발생했습니다.');
		} finally {
			await session.endSession();
		}

		// return this.prisma.$transaction(async (prisma) => {
		// 	const director = await prisma.director.findUnique({
		// 		where: { id: createMovieDto.directorId },
		// 	});

		// 	if (!director) {
		// 		throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
		// 	}

		// 	const genres = await prisma.genre.findMany({
		// 		where: {
		// 			id: {
		// 				in: createMovieDto.genreIds,
		// 			},
		// 		},
		// 	});

		// 	if (genres.length !== createMovieDto.genreIds.length) {
		// 		throw new NotFoundException(`존재하지 않는 장르가 있습니다. 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`);
		// 	}

		// 	const movieDetail = await prisma.movieDetail.create({
		// 		data: {
		// 			detail: createMovieDto.detail,
		// 			movieId: null,
		// 		},
		// 	});

		// 	const movie = await prisma.movie.create({
		// 		data: {
		// 			title: createMovieDto.title,
		// 			movieFilePath: createMovieDto.movieFileName,
		// 			creator: { connect: { id: userId } },
		// 			director: { connect: { id: director.id } },
		// 			genres: {
		// 				connect: genres.map((genre) => ({ id: genre.id })),
		// 			},
		// 			detail: { connect: { id: movieDetail.id } },
		// 		},
		// 	});
		// 	return prisma.movie.findUnique({
		// 		where: {
		// 			id: movie.id,
		// 		},
		// 		include: {
		// 			detail: true,
		// 			director: true,
		// 			genres: true,
		// 		},
		// 	});
		// });
	}

	// async create1(createMovieDto: CreateMovieDto, userId: number) {
	// 	const director = await qr.manager.findOne(Director, {
	// 		where: { id: createMovieDto.directorId },
	// 	});

	// 	if (!director) {
	// 		throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
	// 	}

	// 	const genres = await qr.manager.find(Genre, {
	// 		where: { id: In(createMovieDto.genreIds) },
	// 	});

	// 	if (genres.length !== createMovieDto.genreIds.length) {
	// 		throw new NotFoundException(
	// 			`존재하지 않는 장르가 있습니다! 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`,
	// 		);
	// 	}

	// 	const movieDetail = await this.createMovieDetail(qr, createMovieDto);

	// 	const movieDetailId = movieDetail.identifiers[0].id;

	// 	const movieFolder = join('public', 'movie');
	// 	const tempFolder = join('public', 'temp');

	// 	const movie = await this.createMovie(
	// 		qr,
	// 		createMovieDto,
	// 		movieDetailId,
	// 		director,
	// 		userId,
	// 		genres,
	// 		movieFolder,
	// 	);

	// 	const movieId = movie.identifiers[0].id;

	// 	await this.renameMovieFile(tempFolder, movieFolder, createMovieDto);

	// 	await this.createMovieGenreRelation(qr, movieId, genres);

	// 	return qr.manager.findOne(Movie, {
	// 		where: { id: movieId },
	// 		relations: ['detail', 'director', 'genres'],
	// 	});
	// }

	async update(id: string, updateMovieDto: UpdateMovieDto) {
		const session = await this.movieModel.startSession();
		session.startTransaction();

		try {
			const movie = await this.movieModel
				.findById(id)
				.populate({
					path: 'genres',
					model: 'Genre',
				})
				.populate('detail')
				.exec();

			if (!movie) {
				throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
			}
			const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

			let movieUpdateParams: {
				title?: string;
				movieFileName?: string;
				director?: Types.ObjectId;
				genres?: Types.ObjectId[];
			} = {
				...movieRest,
			};

			if (directorId) {
				const director = await this.directorModel.findById(directorId).exec();

				if (!director) {
					throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
				}

				movieUpdateParams.director = director._id as Types.ObjectId;
			}

			if (genreIds) {
				const genres = await this.genreModel.find({ _id: { $in: genreIds } }).exec();

				if (genres.length !== genreIds.length) {
					throw new NotFoundException(
						`존재하지 않는 장르가 있습니다. 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`,
					);
				}

				movieUpdateParams.genres = genres.map((genre) => genre._id) as Types.ObjectId[];
			}

			if (detail) {
				await this.movieDetailModel.findByIdAndUpdate(movie.detail._id, { detail }, { session }).exec();
			}

			await this.movieModel.findByIdAndUpdate(id, movieUpdateParams, { session }).exec();

			await session.commitTransaction();

			return this.movieModel.findById(id).populate('detail genres').exec();
		} catch (e) {
			await session.abortTransaction();
		} finally {
			await session.endSession();
		}

		// return this.prisma.$transaction(async (prisma) => {
		// 	const movie = await prisma.movie.findUnique({
		// 		where: {
		// 			id,
		// 		},
		// 		include: {
		// 			detail: true,
		// 			genres: true,
		// 		},
		// 	});

		// 	if (!movie) {
		// 		throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		// 	}

		// 	const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

		// 	let movieUpdateParams: Prisma.MovieUpdateInput = {
		// 		...movieRest,
		// 	};

		// 	if (directorId) {
		// 		const director = await prisma.director.findUnique({
		// 			where: {
		// 				id: directorId,
		// 			},
		// 		});

		// 		if (!director) {
		// 			throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
		// 		}

		// 		movieUpdateParams.director = {
		// 			connect: { id: director.id },
		// 		};
		// 	}

		// 	if (genreIds) {
		// 		const genres = await prisma.genre.findMany({
		// 			where: {
		// 				id: { in: genreIds },
		// 			},
		// 		});
		// 		if (genres.length !== genreIds.length) {
		// 			throw new NotFoundException(`존재하지 않는 장르가 있습니다. 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`);
		// 		}

		// 		movieUpdateParams.genres = {
		// 			set: genres.map((genre) => ({ id: genre.id })),
		// 		};
		// 	}

		// 	await prisma.movie.update({
		// 		where: { id },
		// 		data: movieUpdateParams,
		// 	});

		// 	if (detail) {
		// 		await prisma.movieDetail.update({
		// 			where: { id: movie.detail.id },
		// 			data: { detail },
		// 		});
		// 	}

		// 	return prisma.movie.findUnique({
		// 		where: { id },
		// 		include: {
		// 			detail: true,
		// 			director: true,
		// 			genres: true,
		// 		},
		// 	});
		// });
	}

	// async update(id: number, updateMovieDto: UpdateMovieDto) {
	// 	const qr = this.dataSource.createQueryRunner();
	// 	await qr.connect();
	// 	await qr.startTransaction();

	// 	try {
	// 		const movie = await qr.manager.findOne(Movie, {
	// 			where: { id },
	// 			relations: ['detail', 'genres'],
	// 		});

	// 		if (!movie) {
	// 			throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
	// 		}

	// 		const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

	// 		let newDirector: Director;

	// 		if (directorId) {
	// 			const director = await qr.manager.findOne(Director, {
	// 				where: { id: directorId },
	// 			});

	// 			if (!director) {
	// 				throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
	// 			}

	// 			newDirector = director;
	// 		}

	// 		let newGenres;

	// 		if (genreIds) {
	// 			const genres = await qr.manager.find(Genre, {
	// 				where: { id: In(genreIds) },
	// 			});

	// 			if (genres.length !== updateMovieDto.genreIds.length) {
	// 				throw new NotFoundException(`존재하지 않는 장르가 있습니다! 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`);
	// 			}

	// 			newGenres = genres;
	// 		}

	// 		const movieUpdateFields = {
	// 			...movieRest,
	// 			...(newDirector && { director: newDirector }), //조건부 스프레드 문법
	// 		};

	// 		await this.updateMovie(qr, movieUpdateFields, id);

	// 		if (detail) {
	// 			await this.updateMovieDetail(qr, detail, movie);
	// 		}

	// 		if (newGenres) {
	// 			await this.updateMovieGenreRelation(qr, id, newGenres, movie);
	// 		}

	// 		await qr.commitTransaction();

	// 		return this.movieRepository.findOne({
	// 			where: { id },
	// 			relations: ['detail', 'director', 'genres'],
	// 		});
	// 	} catch (error) {
	// 		await qr.rollbackTransaction();
	// 		throw error;
	// 	} finally {
	// 		await qr.release();
	// 	}

	async remove(id: string) {
		const movie = await this.movieModel.findById(id).populate('detail').exec();

		// this.prisma.$transaction(async (prisma) => {
		// 	const movie = await prisma.movie.findUnique({
		// 		where: {
		// 			id: parseInt(id.toString()),
		// 		},
		// 		include: {
		// 			detail: true,
		// 		},
		// 	});

		if (!movie) {
			throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		}

		await this.movieModel.findByIdAndDelete(id).exec();
		// await prisma.movie.delete({
		// 	where: {
		// 		id: parseInt(id.toString()),
		// 	},
		// });

		await this.movieDetailModel.findByIdAndDelete(movie.detail._id).exec();

		// await prisma.movieDetail.delete({
		// 	where: { id: movie.detail.id },
		// });

		return id;
		// const movie = await this.prisma.movie.findUnique({
		// 	where: {
		// 		id,
		// 	},
		// 	include: {
		// 		detail: true,
		// 	},
		// });
		// // const movie = await this.movieRepository.findOne({
		// //     where: { id },
		// //     relations: ['detail'],
		// // });

		// if (!movie) {
		// 	throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		// }

		// await this.prisma.movie.delete({
		// 	where: { id },
		// });

		// // await this.deleteMovie(id);

		// // await this.movieRepository.delete({ id });

		// await this.prisma.movieDetail.delete({
		// 	where: {
		// 		id: movie.detail.id,
		// 	},
		// });

		// // await this.movieDetailRepository.delete(movie.detail.id);
		// return id;
	}

	async toggleMovieLike(movieId: string, userId: string, isLike: boolean) {
		const movie = await this.movieModel.findById(movieId).exec();
		// const movie = await this.prisma.movie.findUnique({
		// 	where: {
		// 		id: movieId,
		// 	},
		// });
		// const movie = await this.movieRepository.findOne({
		//     where: { id: movieId },
		// });

		if (!movie) {
			throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		}

		const user = await this.userModel.findById(userId).exec();
		// const user = await this.prisma.user.findUnique({
		// 	where: {
		// 		id: userId,
		// 	},
		// });
		// const user = await this.userRepository.findOne({
		//     where: { id: userId },
		// });

		if (!user) {
			throw new UnauthorizedException('존재하지 않는 아이디의 유저입니다.');
		}

		const likeRecord = await this.movieUserLikeModel.findOne({
			movie: new Types.ObjectId(movieId),
			user: new Types.ObjectId(userId),
		});

		// const likeRecord = await this.prisma.movieUserLike.findUnique({
		// 	where: {
		// 		movieId_userId: {
		// 	movieId,
		// 	userId,
		// },
		// 	},
		// });

		// const likeRecord = await this.getLikedRecord(movieId, userId);

		if (likeRecord) {
			if (isLike === likeRecord.isLike) {
				await this.movieUserLikeModel.findByIdAndDelete(likeRecord._id).exec();
				// await this.prisma.movieUserLike.delete({
				// 	where: {
				// 		movieId_userId: {
				// 			movieId,
				// 			userId,
				// 		},
				// 	},
				// await this.movieUserLikeRepository.delete({
				//     movie,
				//     user,
				// });
			} else {
				likeRecord.isLike = isLike;
				likeRecord.save();
				// await this.movieUserLikeModel.findByIdAndUpdate(likeRecord._id, {
				// 	isLike,
				// });

				// await this.prisma.movieUserLike.update({
				// 	where: {
				// 		movieId_userId: {
				// 			movieId,
				// 			userId,
				// 		},
				// 	},
				// 	data: {
				// 		isLike,
				// 	},
				// });
				// await this.movieUserLikeRepository.update(
				//     {
				//         movie,
				//         user,
				//     },
				//     {
				//         isLike,
				//     },
				// );
			}
		} else {
			await this.movieUserLikeModel.create({
				movie: new Types.ObjectId(movieId),
				user: new Types.ObjectId(userId),
				isLike,
			});
			// await this.prisma.movieUserLike.create({
			// 	data: {
			// 		movie: {
			// 			connect: { id: movieId },
			// 	},
			// 	user: {
			// 		connect: { id: userId },
			// 	},
			// });
			// await this.movieUserLikeRepository.save({
			//     movie,
			//     user,
			//     isLike,
			// });
		}

		const result = await this.movieUserLikeModel.findOne({
			movie: new Types.ObjectId(movieId),
			user: new Types.ObjectId(userId),
		});

		// const result = await this.prisma.movieUserLike.findUnique({
		// 	where: {
		// 		movieId_userId: {
		// 			movieId,
		// 			userId,
		// 		},
		// 	},
		// });
		// const result = await this.getLikedRecord(movieId, userId);

		return {
			isLike: result ? result.isLike : null,
		};
	}

	//////////////////////////////////////////////// 내부 기능 메소드 ////////////////////////////////////////////////
	//////////////////////////////////////////////// 내부 기능 메소드 ////////////////////////////////////////////////

	/* istanbul ignore next */
	async getMovies() {
		// return this.movieRepository
		//     .createQueryBuilder('movie')
		//     .leftJoinAndSelect('movie.director', 'director')
		//     .leftJoinAndSelect('movie.genres', 'genres');
	}

	/* istanbul ignore next */
	async getLikedMovies(movieIds: number[], userId: number) {
		// return await this.movieUserLikeRepository
		//     .createQueryBuilder('mul')
		//     .leftJoinAndSelect('mul.user', 'user')
		//     .leftJoinAndSelect('mul.movie', 'movie')
		//     .where('movie.id In(:...movieIds)', { movieIds })
		//     .andWhere('user.id = :userId', { userId })
		//     .getMany();
	}

	/* istanbul ignore next */
	async findMovieDetailById(id: number) {
		// return await this.movieRepository
		//     .createQueryBuilder('movie')
		//     .leftJoinAndSelect('movie.director', 'director')
		//     .leftJoinAndSelect('movie.genres', 'genres')
		//     .leftJoinAndSelect('movie.detail', 'detail')
		//     .leftJoinAndSelect('movie.creator', 'creator')
		//     .where('movie.id = :id', { id })
		//     .getOne();
	}

	/* istanbul ignore next */
	async createMovieDetail(qr: QueryRunner, createMovieDto: CreateMovieDto) {
		// return await qr.manager
		//     .createQueryBuilder()
		//     .insert()
		//     .into(MovieDetail)
		//     .values({
		//         detail: createMovieDto.detail,
		//     })
		//     .execute();
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
		// return await qr.manager
		//     .createQueryBuilder()
		//     .insert()
		//     .into(Movie)
		//     .values({
		//         title: createMovieDto.title,
		//         detail: {
		//             id: movieDetailId,
		//         },
		//         director,
		//         creator: {
		//             id: userId,
		//         },
		//         genres,
		//         movieFilePath: join(movieFolder, createMovieDto.movieFileName),
		//     })
		//     .execute();
	}

	/* istanbul ignore next */
	async createMovieGenreRelation(qr: QueryRunner, movieId: number, genres: Genre[]) {
		// return await qr.manager
		//     .createQueryBuilder()
		//     .relation(Movie, 'genres')
		//     .of(movieId)
		//     .add(genres.map((genre) => genre.id));
	}

	/* istanbul ignore next */
	async renameMovieFile(tempFolder: string, movieFolder: string, createMovieDto: CreateMovieDto) {
		console.log(process.env.ENV);
		// if (process.env.ENV !== 'prod') {
		// 	// return await rename(
		// 	// 	join(process.cwd(), tempFolder, createMovieDto.movieFileName),
		// 	// 	join(process.cwd(), movieFolder, createMovieDto.movieFileName),
		// 	// );
		// } else {
		// 	return this.commonService.saveMovieToPermanentStorage(createMovieDto.movieFileName);
		// }
	}

	/* istanbul ignore next */
	async updateMovie(qr: QueryRunner, movieUpdateFields: any, id: number) {
		// return await qr.manager
		//     .createQueryBuilder()
		//     .update(Movie)
		//     .set(movieUpdateFields)
		//     .where('id = :id', { id })
		//     .execute();
	}

	/* istanbul ignore next */
	async updateMovieDetail(qr: QueryRunner, detail: string, movie: Movie) {
		// return await qr.manager
		//     .createQueryBuilder()
		//     .update(MovieDetail)
		//     .set({
		//         detail,
		//     })
		//     .where('id = :id', { id: movie.detail.id })
		//     .execute();
	}

	/* istanbul ignore next */
	async updateMovieGenreRelation(qr: QueryRunner, id: number, newGenres: Genre[], movie: Movie) {
		// return await qr.manager
		//     .createQueryBuilder()
		//     .relation(Movie, 'genres')
		//     .of(id)
		//     .addAndRemove(
		//         newGenres.map((genre) => genre.id),
		//         movie.genres.map((genre) => genre.id),
		//     );
	}

	/* istanbul ignore next */
	async deleteMovie(id: number) {
		// return await this.movieRepository
		//     .createQueryBuilder()
		//     .delete()
		//     .from(Movie)
		//     .where('id = :id', { id })
		//     .execute();
	}

	/* istanbul ignore next */
	async getLikedRecord(movieId: number, userId: number) {
		//     return await this.movieUserLikeRepository
		//         .createQueryBuilder('mul')
		//         .leftJoinAndSelect('mul.movie', 'movie')
		//         .leftJoinAndSelect('mul.user', 'user')
		//         .where('movie.id = :movieId', { movieId })
		//         .andWhere('user.id = :userId', { userId })
		//         .getOne();
		// }
	}
}
