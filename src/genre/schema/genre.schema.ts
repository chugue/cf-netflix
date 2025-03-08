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
		select: false,
	})
	name: string;

	@Prop({
		type: [{ type: Types.ObjectId, ref: 'Movie' }],
	})
	movie: Movie[];
}

export const GenreSchema = SchemaFactory.createForClass(Genre);

GenreSchema.set('toObject', {
	transform: (model, ret) => {
		ret.id = ret._id.toString();
		return ret;
	},
});
