import { Module } from '@nestjs/common';
import { GenreService } from './genre.service';
import { GenreController } from './genre.controller';
import { Genre } from './entity/genre.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from 'src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([Genre]), CommonModule],
    controllers: [GenreController],
    providers: [GenreService],
})
export class GenreModule {}
