import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class MovieTitleValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      return value;
    }

    // 만약에 글자 길이가 2보다 작으면 에러 던지기!
    if (value.length < 3) {
      throw new BadRequestException(
        '영화 제목은 최소 3글자 이상이어야 합니다.',
      );
    }
    return value;
  }
}
