import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { Movie } from 'src/movie/schema/movie.schema';

@Schema({
	timestamps: true,
})
export class Genre extends Document {
	@Prop({
		required: true,
		unique: true,
	})
	name: string;

	@Prop({
		type: [{ type: Types.ObjectId, ref: 'Movie' }],
	})
	movie: Movie[];
}

export const GenreSchema = SchemaFactory.createForClass(Genre);
