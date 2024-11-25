import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';

export class GetMoviesDto extends CursorPaginationDto {
  @IsOptional()
  @IsString()
  title?: string;
}
