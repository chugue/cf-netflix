import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  getMovies(@Query('title') title?: string) {
    return this.movieService.findAll(title);
  }

  @Get(':id')
  getMovie(@Param('id') id: string) {
    return this.movieService.findOne(+id);
  }

  @Post()
  postMovie(@Body() reqDTO: CreateMovieDto) {
    return this.movieService.create(reqDTO);
  }

  @Patch(':id')
  updateMovie(@Param('id') id: string, @Body() reqDTO: UpdateMovieDto) {
    return this.movieService.update(+id, reqDTO);
  }

  @Delete(':id')
  deleteMovie(@Param('id') id: string) {
    return this.movieService.remove(+id);
  }
}
