import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { DataSource, In, Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { title } from 'process';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie) private movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private genreRepository: Repository<Genre>,
    private dataSource: DataSource,
  ) {}

  async findAll(title?: string) {
    const qb = await this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres');

    if (title) {
      qb.where('movie.title LIKE :title', { title: `%${title}%` });
    }

    return qb.getManyAndCount();

    // if (!title) {
    //   return [
    //     await this.movieRepository.find({
    //       relations: ['director', 'genres'],
    //     }),
    //     await this.movieRepository.count(),
    //   ];
    // }

    // return this.movieRepository.findAndCount({
    //   where: {
    //     title: Like(`%${title}%`),
    //   },
    //   relations: ['director', 'genres'],
    // });
  }

  async findOne(id: number) {
    const movie = await this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')
      .leftJoinAndSelect('movie.detail', 'detail')
      .where('movie.id = :id', { id })
      .getOne();

    // const movie = await this.movieRepository.findOne({
    //   where: { id },
    //   relations: ['detail', 'director', 'genres'],
    // });

    if (!movie) {
      throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
    }

    return movie;
  }

  async create(createMovieDto: CreateMovieDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
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

      const movieDetail = await qr.manager
        .createQueryBuilder()
        .insert()
        .into(MovieDetail)
        .values({
          detail: createMovieDto.detail,
        })
        .execute();

      const movieDetailId = movieDetail.identifiers[0].id;

      const movie = await qr.manager
        .createQueryBuilder()
        .insert()
        .into(Movie)
        .values({
          title: createMovieDto.title,
          detail: {
            id: movieDetailId,
          },
          director,
          genres,
        })
        .execute();

      const movieId = movie.identifiers[0].id;

      await qr.manager
        .createQueryBuilder()
        .relation(Movie, 'genres')
        .of(movieId)
        .add(genres.map((genre) => genre.id));

      // const movie = await this.movieRepository.save({
      //   title: createMovieDto.title,
      //   detail: {
      //     detail: createMovieDto.detail,
      //   },
      //   director,
      //   genres,
      // });

      await qr.commitTransaction();

      return this.movieRepository.findOne({
        where: { id: movieId },
        relations: ['detail', 'director', 'genres'],
      });
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: ['detail', 'genres'],
    });

    if (!movie) {
      throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
    }

    const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

    let newDirector: Director;

    if (directorId) {
      const director = await this.directorRepository.findOne({
        where: { id: directorId },
      });

      if (!director) {
        throw new NotFoundException('존재하지 않는 아이디의 감독입니다.');
      }

      newDirector = director;
    }

    let newGenres;

    if (genreIds) {
      const genres = await this.genreRepository.find({
        where: { id: In(genreIds) },
      });

      if (genres.length !== updateMovieDto.genreIds.length) {
        throw new NotFoundException(
          `존재하지 않는 장르가 있습니다! 존재하는 ids -> ${genres.map((genre) => genre.id).join(', ')}`,
        );
      }

      newGenres = genres;
    }

    /**
     * {
     * ...movieRest,
     * {director: director}
     *
     * {
     * ...movieRest,
     * director: director
     * }
     */
    const movieUpdateFields = {
      ...movieRest,
      ...(newDirector && { director: newDirector }), //조건부 스프레드 문법
    };

    await this.movieRepository
      .createQueryBuilder()
      .update(Movie)
      .set(movieUpdateFields)
      .where('id = :id', { id })
      .execute();

    // await this.movieRepository.update({ id }, movieUpdateFields);

    if (detail) {
      await this.movieDetailRepository
        .createQueryBuilder()
        .update(MovieDetail)
        .set({ detail })
        .where('id = :id', { id: movie.detail.id })
        .execute();
    }

    // if (detail) {
    //   await this.movieDetailRepository.update(
    //     {
    //       id: movie.detail.id,
    //     },
    //     { detail },
    //   );
    // }
    if (newGenres) {
      await this.movieRepository
        .createQueryBuilder()
        .relation(Movie, 'genres')
        .of(id)
        .addAndRemove(
          newGenres.map((genre) => genre.id),
          movie.genres.map((genre) => genre.id),
        );
    }

    // const newMovie = await this.movieRepository.findOne({
    //   where: { id },
    //   relations: ['detail', 'director'],
    // });

    // newMovie.genres = newGenres;

    // await this.movieRepository.save(newMovie);

    return this.movieRepository.findOne({
      where: { id },
      relations: ['detail', 'director', 'genres'],
    });
  }

  async remove(id: number) {
    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: ['detail'],
    });

    if (!movie) {
      throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
    }

    await this.movieRepository
      .createQueryBuilder()
      .delete()
      .from(Movie)
      .where('id = :id', { id })
      .execute();

    // await this.movieRepository.delete({ id });
    await this.movieDetailRepository.delete(movie.detail.id);
    return id;
  }
}
