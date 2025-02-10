import { Module } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { Movie } from './entity/movie.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { CommonModule } from 'src/common/common.module';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Movie, MovieDetail, Director, Genre, MovieUserLike, User]),
        CommonModule,

        // MulterModule.register({
        //   storage: diskStorage({
        //     // ......./NETFLIX/public/movie
        //     destination: join(process.cwd(), 'public', 'movie'),
        //     filename: (req, file, callback) => {
        //       const split = file.originalname.split('.');
        //       let extension = 'mp4';

        //       if (split.length > 1) {
        //         extension = split[split.length - 1];
        //       }
        //       callback(null, `${uuidv4()}_${Date.now()}.${extension}`);
        //     },
        //   }),
        // }),
    ],
    controllers: [MovieController],
    providers: [MovieService],
})
export class MovieModule {}
