import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';

export class GetMoviesDto extends CursorPaginationDto {
    @IsOptional()
    @IsString()
    @ApiProperty({
        description: '영화 제목',
        example: '프로메테우스',
    })
    title?: string;
}
