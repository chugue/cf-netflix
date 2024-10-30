import { PartialType } from '@nestjs/mapped-types';
import { CreateDirectorDto } from './create-director.dto';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateDirectorDto {
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  name?: string;

  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  dob?: Date;

  @IsNotEmpty()
  @IsOptional()
  @IsString()
  nationality?: string;
}
