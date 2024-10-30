import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Column } from 'typeorm';

export class CreateGenreDto {
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  name: string;
}
