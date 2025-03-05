import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, ClassSerializerInterceptor, ParseIntPipe, Request, Req, UploadedFile, UploadedFiles, BadRequestException, Version } from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Public } from 'src/auth/decorator/public.decorator';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CacheInterceptor } from 'src/common/interceptor/cache.interceptor';
import { TransactionInterceptor } from 'src/common/interceptor/transasction.interceptor';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MovieFilePipe } from './pipe/movie-file.pipe';
import { UserId } from 'src/user/decorator/user-id.decorator';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner as QR } from 'typeorm';
import { CacheKey, CacheTTL, CacheInterceptor as CI } from '@nestjs/cache-manager';
import { Throttle } from 'src/common/decorator/throttle.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';

@Controller('movie')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
	constructor(private readonly movieService: MovieService) {}

	@Get()
	@Public()
	@Throttle({
		count: 5,
		unit: 'minute',
	})
	@ApiOperation({ description: '[Movie]를 Pagination하는 API' })
	@ApiResponse({
		status: 200,
		description: '성공적으로 API Pagination을 실행했을 때!',
	})
	@ApiResponse({
		status: 400,
		description: '페이지 네이션 데이터를 잘못 입력했을 때',
	})
	getMovies(@Query() dto: GetMoviesDto, @UserId() userId?: number) {
		return this.movieService.findAll(dto, userId);
	}

	// /movie/recent
	@Get('recent')
	@UseInterceptors(CI)
	@CacheKey('getMoviesRecent')
	@CacheTTL(10000)
	getMoviesRecent() {
		return this.movieService.findRecent();
	}

	// /movie/alksdjflk
	@Get(':id')
	@Public()
	getMovie(
		@Param('id', ParseIntPipe)
		id: number,
		@Req() req: any,
	) {
		const session = req.session;

		const movieCount = session.movieCount ?? {};

		req.session.movieCount = {
			...movieCount,
			[id]: movieCount[id] ? movieCount[id] + 1 : 1,
		};

		console.log(session);

		return this.movieService.findOne(id);
	}

	@Post()
	@RBAC(Role.ADMIN)
	// @UseInterceptors(TransactionInterceptor)
	postMovie(
		@Body() reqDTO: CreateMovieDto,
		// @QueryRunner() queryRunner: QR,
		@UserId() userId: number,
	) {
		return this.movieService.create(reqDTO, userId);
	}

	@Patch(':id')
	@RBAC(Role.ADMIN)
	updateMovie(@Param('id', ParseIntPipe) id: number, @Body() reqDTO: UpdateMovieDto) {
		return this.movieService.update(id, reqDTO);
	}

	@Delete(':id')
	@RBAC(Role.ADMIN)
	deleteMovie(@Param('id') id: number) {
		return this.movieService.remove(id);
	}

	/**
	 * [Like] [Dislike]
	 *
	 * 아무것도 누르지 않은 상태
	 * Like & Dislike 모두 버튼 꺼져있음
	 *
	 * Like 버튼 누르면
	 * Like 버튼 불 켜짐
	 *
	 * Like 버튼 다시 누르면
	 * Like 버튼 불 꺼짐
	 *
	 * Dislike 버튼 누르면
	 * Dislike 버튼 불 켜짐
	 *
	 * Dislike 버튼 다시 누르면
	 * Dislike 버튼 불 꺼짐
	 *
	 * Like 버튼 누름
	 * Like 버튼 불 켜짐
	 *
	 * Dislike 버튼 누름
	 * Like 버튼 불 꺼지고 Dislike 버튼 불 켜짐
	 */

	@Post(':id/like')
	createMovieLike(@Param('id', ParseIntPipe) movieId: number, @UserId() userId: number) {
		return this.movieService.toggleMovieLike(movieId, userId, true);
	}

	@Post(':id/dislike')
	createMovieDislike(@Param('id', ParseIntPipe) movieId: number, @UserId() userId: number) {
		return this.movieService.toggleMovieLike(movieId, userId, false);
	}
}
