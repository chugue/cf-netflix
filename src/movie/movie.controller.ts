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
import { Public } from 'src/auth/decorator/public.decorator';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { Role } from 'src/user/entities/user.entity';

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  @Public()
  getMovies(@Query('title', MovieTitleValidationPipe) title?: string) {
    return this.movieService.findAll(title);
  }

  @Get(':id')
  @Public()
  getMovie(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.movieService.findOne(id);
  }

  @Post()
  @RBAC(Role.ADMIN)
  postMovie(@Body() reqDTO: CreateMovieDto) {
    return this.movieService.create(reqDTO);
  }

  @Patch(':id')
  @RBAC(Role.ADMIN)
  updateMovie(
    @Param('id', ParseIntPipe) id: number,
    @Body() reqDTO: UpdateMovieDto,
  ) {
    return this.movieService.update(id, reqDTO);
  }

  @Delete(':id')
  @RBAC(Role.ADMIN)
  deleteMovie(@Param('id') id: number) {
    return this.movieService.remove(id);
  }
}
