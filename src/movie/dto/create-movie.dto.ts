import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  detail?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsNumber()
  directorId?: number;

  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsArray()
  genreIds?: number[];
}
