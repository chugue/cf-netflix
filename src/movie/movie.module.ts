import { Module } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { Movie } from './entity/movie.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entity/genre.entity';
import { CommonModule } from 'src/common/common.module';
import { User } from 'src/user/entity/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Movie, MovieDetail, Director, Genre, MovieUserLike, User]),
        CommonModule,
    ],
    controllers: [MovieController],
    providers: [MovieService],
})
export class MovieModule {}
