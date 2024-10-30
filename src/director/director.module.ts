import { Module } from '@nestjs/common';
import { DirectorService } from './director.service';
import { DirectorController } from './director.controller';
import { Director } from './entity/director.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Director])],
  controllers: [DirectorController],
  providers: [DirectorService],
})
export class DirectorModule {}
