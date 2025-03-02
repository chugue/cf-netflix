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
@Injectable()
export class UserService {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    async create(createUserDto: CreateUserDto) {
        const { email, password } = createUserDto;

        const user = await this.prisma.user.findUnique({ where: { email } });

        // const user = await this.userRepository.findOne({ where: { email } });

        if (user) {
            throw new BadRequestException('이미 존재하는 이메일입니다.');
        }

        const hashedPassword = await bcrypt.hash(
            password,
            this.configService.get<number>(envKeys.HASH_ROUNDS),
        );

        await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        // await this.userRepository.save({
        //     email,
        //     password: hashedPassword,
        // });

        return this.prisma.user.findUnique({ where: { email } });

        // return this.userRepository.findOne({ where: { email } });
    }

    findAll() {
        return this.prisma.user.findMany();
        // return this.userRepository.find();
    }

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        // const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const { password } = updateUserDto;

        const user = await this.prisma.user.findUnique({ where: { id } });
        // const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const hash = await bcrypt.hash(
            password,
            this.configService.get<number>(envKeys.HASH_ROUNDS),
        );
        await this.prisma.user.update({
            where: { id },
            data: { ...updateUserDto, password: hash },
        });
        // await this.userRepository.update({ id }, { ...updateUserDto, password: hash });
        return this.prisma.user.findUnique({ where: { id } });
        // return this.userRepository.findOne({ where: { id } });
    }

    async remove(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        // const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.user.delete({ where: { id } });
        // await this.userRepository.delete({ id });
        return id;
    }
}
