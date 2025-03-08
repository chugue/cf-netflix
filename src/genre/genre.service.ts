import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Genre } from './schema/genre.schema';
import { Model } from 'mongoose';

@Injectable()
export class GenreService {
	constructor(
		// @InjectRepository(Genre)
		// private readonly genreRepository: Repository<Genre>,
		// private readonly prisma: PrismaService,
		@InjectModel(Genre.name)
		private readonly genreModel: Model<Genre>,
	) {}

	async create(createGenreDto: CreateGenreDto) {
		const genre = await this.genreModel.findOne({
			name: createGenreDto.name,
		});
		// const genre = await this.prisma.genre.findFirst({
		//     where: {
		//         name: createGenreDto.name,
		//     },
		// });
		// const genre = await this.genreRepository.findOne({
		//     where: { name: createGenreDto.name },
		// });

		if (genre) {
			throw new ConflictException('이미 존재하는 장르입니다.');
		}

		// return await this.prisma.genre.create({
		// 	data: createGenreDto,
		// });
		// return await this.genreRepository.save(createGenreDto);

		return await this.genreModel.create(createGenreDto);
		// return { ...result.toObject(), _id: result._id.toString() };
		// return await this.genreModel.findById(result._id).exec();
	}

	async findAll() {
		return await this.genreModel.find().exec();
		// return await this.prisma.genre.findMany();
		// return await this.genreRepository.find();
	}

	async findOne(id: string) {
		const genre = await this.genreModel.findById(id).exec();
		// const genre = await this.prisma.genre.findUnique({
		// 	where: {
		// 		id,
		// 	},
		// });
		// const genre = await this.genreRepository.findOne({ where: { id } });

		if (!genre) throw new NotFoundException('존재하지 않는 장르입니다.');

		return genre;
	}

	async update(id: string, updateGenreDto: UpdateGenreDto) {
		const genre = await this.genreModel.findById(id).exec();
		// const genre = await this.prisma.genre.findUnique({
		// 	where: {
		// 		id,
		// 	},
		// });
		// const genre = await this.genreRepository.findOne({ where: { id } });

		if (!genre) {
			throw new NotFoundException('존재하지 않는 장르입니다.');
		}

		await this.genreModel.findByIdAndUpdate(id, updateGenreDto).exec();
		// await this.prisma.genre.update({
		// 	where: { id },
		// 	data: { ...updateGenreDto },
		// });

		// await this.genreRepository.update({ id }, { ...updateGenreDto });

		const newGenre = await this.genreModel.findById(id).exec();
		// const newGenre = await this.prisma.genre.findUnique({ where: { id } });
		// const newGenre = await this.genreRepository.findOne({ where: { id } });

		return newGenre;
	}

	async remove(id: string) {
		const genre = await this.genreModel.findById(id).exec();
		// const genre = await this.prisma.genre.findUnique({ where: { id } });
		// const genre = await this.genreRepository.findOne({ where: { id } });

		if (!genre) {
			throw new NotFoundException('존재하지 않는 장르입니다.');
		}

		// await this.prisma.genre.delete({ where: { id } });
		// await this.genreRepository.delete(id);

		await this.genreModel.findByIdAndDelete(id).exec();
		return id;
	}
}
