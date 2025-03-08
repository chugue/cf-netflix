import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Movie } from './movie.schema';

@Schema({
	timestamps: true,
})
export class MovieDetail extends Document {
	@Prop({
		required: true,
	})
	detail: string;

	@Prop({
		type: Types.ObjectId,
		ref: 'Movie',
		unique: true,
	})
	movie: Movie;
}

export const MovieDetailSchema = SchemaFactory.createForClass(MovieDetail);
