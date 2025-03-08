import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { Repository } from 'typeorm';
import { Director } from './entity/director.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PrismaService } from 'src/common/prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class DirectorService {
	constructor(
		// @InjectRepository(Director)
		// private readonly directorRepository: Repository<Director>,
		// private readonly prisma: PrismaService,
		@InjectModel(Director.name)
		private readonly directorModel: Model<Director>,
	) {}

	findAll() {
		return this.directorModel.find().exec();
		// return this.prisma.director.findMany();
		// return this.directorRepository.find();
	}

	findOne(id: string) {
		return this.directorModel.findById(id).exec();
		// return this.prisma.director.findUnique({
		//     where: { id },
		// });
		// return this.directorRepository.findOne({ where: { id } });
	}

	create(createDirectorDto: CreateDirectorDto) {
		return this.directorModel.create(createDirectorDto);
		// return this.prisma.director.create({
		//     data: createDirectorDto,
		// });
		// return this.directorRepository.save(createDirectorDto);
	}

	async update(id: string, updateDirectorDto: UpdateDirectorDto) {
		const director = await this.directorModel.findById(id).exec();
		// const director = await this.prisma.director.findUnique({
		//     where: { id },
		// });
		// const director = await this.directorRepository.findOne({
		//     where: { id },
		// });

		if (!director) {
			throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		}

		await this.directorModel
			.findByIdAndUpdate(id, updateDirectorDto, {
				new: true,
			})
			.exec();
		// await this.prisma.director.update({
		//     where: { id },
		//     data: updateDirectorDto,
		// });

		// await this.directorRepository.update(
		//     {
		//         id,
		//     },
		//     {
		//         ...updateDirectorDto,
		//     },
		// );

		const newDirector = await this.directorModel.findById(id).exec();

		// const newDirector = await this.prisma.director.findUnique({
		//     where: { id },
		// });
		// const newDirector = await this.directorRepository.findOne({
		//     where: { id },
		// });

		return newDirector;
	}

	async remove(id: string) {
		const director = await this.directorModel.findById(id).exec();
		// const director = await this.prisma.director.findUnique({
		//     where: { id },
		// });
		// const director = await this.directorRepository.findOne({
		//     where: { id },
		// });

		if (!director) {
			throw new NotFoundException('존재하지 않는 아이디의 영화입니다.');
		}

		await this.directorModel.findByIdAndDelete(id).exec();
		// await this.prisma.director.delete({
		//     where: { id },
		// });

		// await this.directorRepository.delete(id);

		return id;
	}
}
