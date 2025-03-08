import { Module } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { CommonModule } from 'src/common/common.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Movie, MovieSchema } from './schema/movie.schema';
import { MovieDetail, MovieDetailSchema } from './schema/movie-detail.schema';
import { Director, DirectorSchema } from 'src/director/schema/director.schema';
import { Genre, GenreSchema } from 'src/genre/schema/genre.schema';
import { MovieUserLike, MovieUserLikeSchema } from './schema/movie-user-like.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';

@Module({
	imports: [
		// TypeOrmModule.forFeature([Movie, MovieDetail, Director, Genre, MovieUserLike, User]),
		MongooseModule.forFeature([
			{
				name: Movie.name,
				schema: MovieSchema,
			},
			{
				name: MovieDetail.name,
				schema: MovieDetailSchema,
			},
			{
				name: Director.name,
				schema: DirectorSchema,
			},
			{
				name: Genre.name,
				schema: GenreSchema,
			},
			{
				name: MovieUserLike.name,
				schema: MovieUserLikeSchema,
			},
			{
				name: User.name,
				schema: UserSchema,
			},
		]),
		CommonModule,
		// PrismaModule,
	],
	controllers: [MovieController],
	providers: [MovieService],
})
export class MovieModule {}
