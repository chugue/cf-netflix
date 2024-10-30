import { IsDateString, IsNotEmpty, IsString, isString } from 'class-validator';
import { Column } from 'typeorm';

export class CreateDirectorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  dob: Date;

  @IsNotEmpty()
  @IsString()
  nationality: string;
}
