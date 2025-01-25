import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
    @ApiProperty({
        description: '영화 제목',
        example: '겨울 왕국',
    })
    title: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: '영화 상세 설명',
        example: '겨울 왕국은 겨울 왕국의 왕이 되기 위해 싸우는 소녀의 이야기',
    })
    detail: string;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({
        description: '감독 객체 아이디',
        example: 1,
    })
    directorId: number;

    @ArrayNotEmpty()
    @IsArray()
    @IsNumber({}, { each: true })
    @Type(() => Number)
    @ApiProperty({
        description: '장르 객체 아이디 배열',
        example: [1, 2, 3],
    })
    genreIds: number[];

    @IsString()
    @ApiProperty({
        description: '영화 파일 이름',
        example: 'movie.mp4',
    })
    movieFileName: string;
}
