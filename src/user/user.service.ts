import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import * as bcrypt from 'bcrypt';
import { envKeys } from 'src/common/const/env.const';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma.service';
import { Prisma } from '@prisma/client';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
@Injectable()
export class UserService {
	constructor(
		private readonly configService: ConfigService,
		// private readonly prisma: PrismaService,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
	) {}

	async create(createUserDto: CreateUserDto) {
		const { email, password } = createUserDto;

		const user = await this.userModel.findOne({ email }).exec();

		// const user = await this.prisma.user.findUnique({ where: { email } });
		// const user = await this.userRepository.findOne({ where: { email } });

		if (user) {
			throw new BadRequestException('이미 존재하는 이메일입니다.');
		}

		const hashedPassword = await bcrypt.hash(password, this.configService.get<number>(envKeys.HASH_ROUNDS));

		// const newUser = new this.userModel({
		// 	email,
		// 	password: hashedPassword,
		// });

		// await this.userModel.create(newUser);

		await this.userModel.create({
			email,
			password: hashedPassword,
		});

		// await this.prisma.user.create({
		// 	data: {
		// 		email,
		// 		password: hashedPassword,
		// 	},
		// });

		// await this.userRepository.save({
		//     email,
		//     password: hashedPassword,
		// });

		return this.userModel.findOne({ email }).exec();
		// return this.prisma.user.findUnique({ where: { email } });
		// return this.userRepository.findOne({ where: { email } });
	}

	findAll() {
		return this.userModel.find().exec();
		// return this.prisma.user.findMany();
		// return this.userRepository.find();
	}

	async findOne(id: number) {
		const user = await this.userModel.findById(id).exec();

		// const user = await this.prisma.user.findUnique({ where: { id } });
		// const user = await this.userRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	async update(id: number, updateUserDto: UpdateUserDto) {
		const { password } = updateUserDto;

		const user = await this.userModel.findById(id).exec();

		// const user = await this.prisma.user.findUnique({ where: { id } });
		// const user = await this.userRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		let input = {
			...updateUserDto,
		};

		if (password) {
			const hash = await bcrypt.hash(password, process.env.HASH_ROUNDS);

			input = {
				...input,
				password: hash,
			};
		}

		// const hash = await bcrypt.hash(
		//     password,
		//     this.configService.get<number>(envKeys.HASH_ROUNDS),
		// );

		await this.userModel.findByIdAndUpdate(id, input).exec();
		// await this.prisma.user.update({
		// 	where: { id },
		// 	data: input,
		// });
		// await this.userRepository.update({ id }, { ...updateUserDto, password: hash });

		return this.userModel.findById(id);
		// return this.prisma.user.findUnique({ where: { id } });
		// return this.userRepository.findOne({ where: { id } });
	}

	async remove(id: number) {
		const user = await this.userModel.findById(id).exec();
		// const user = await this.prisma.user.findUnique({ where: { id } });
		// const user = await this.userRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException('User not found');
		}

		await this.userModel.findByIdAndDelete(id).exec();
		// await this.prisma.user.delete({ where: { id } });
		// await this.userRepository.delete({ id });
		return id;
	}
}
