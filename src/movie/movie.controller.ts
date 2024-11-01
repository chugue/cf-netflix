import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieTitleValidationPipe } from './pipe/movie-title-valiation.pipe';
import { AuthGuard } from 'src/auth/guard/auth.guard';

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  getMovies(@Query('title', MovieTitleValidationPipe) title?: string) {
    return this.movieService.findAll(title);
  }
  b;

  @Get(':id')
  getMovie(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.movieService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  postMovie(@Body() reqDTO: CreateMovieDto) {
    return this.movieService.create(reqDTO);
  }

  @Patch(':id')
  updateMovie(
    @Param('id', ParseIntPipe) id: number,
    @Body() reqDTO: UpdateMovieDto,
  ) {
    return this.movieService.update(id, reqDTO);
  }

  @Delete(':id')
  deleteMovie(@Param('id') id: number) {
    return this.movieService.remove(id);
  }
}
