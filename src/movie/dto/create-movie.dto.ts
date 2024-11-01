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
  title: string;

  @IsNotEmpty()
  @IsString()
  detail: string;

  @IsNotEmpty()
  @IsNumber()
  directorId: number;

  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsArray()
  genreIds: number[];
}
