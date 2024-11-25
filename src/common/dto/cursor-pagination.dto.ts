import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CursorPaginationDto {
  @IsString()
  @IsOptional()
  // id_52, likeCount_20
  cursor?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  // id_ASC, id_DESC
  // [ id_ASC, likeCount_DESC ]
  order?: string[] = ['id_DESC'];

  @IsInt()
  @IsOptional()
  take?: number = 5;
}
