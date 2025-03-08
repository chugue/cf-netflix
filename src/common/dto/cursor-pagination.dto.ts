import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CursorPaginationDto {
	@IsString()
	@IsOptional()
	@ApiProperty({
		description: '페이지네이션 커서',
		example: 'eyJ2YWx1ZXMiOnsiaWQiOjV9LCJvcmRlciI6WyJpZF9ERVNDIl19',
	})
	// id_52, likeCount_20
	cursor?: string;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@ApiProperty({
		description: '내림 또는 오름차순 정렬',
		example: ['id_DESC'],
	})
	@Transform(({ value }) => (Array.isArray(value) ? value : [value]))
	// id_ASC, id_DESC
	// [ id_ASC, likeCount_DESC ]
	order: string[] = ['id_DESC'];

	@IsInt()
	@IsOptional()
	@ApiProperty({
		description: '가져올 데이터 갯수',
		example: 5,
	})
	take: number = 2;
}
