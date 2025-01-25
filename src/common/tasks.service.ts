import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { readdir, unlink } from 'fs/promises';
import { join, parse } from 'path';
import { Movie } from 'src/movie/entity/movie.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Movie)
        private readonly movieRepository: Repository<Movie>,
    ) {}

    logEverySecond() {
        console.log('1분 마다 실행!');
    }

    @Cron('* * * * * *')
    async eraseOrphanFiles() {
        const files = await readdir(join(process.cwd(), 'public', 'temp'));

        const deleteFilesTargets = files.filter((file) => {
            const filename = parse(file).name; // 확장자를 제외한 이름이 들어옴
            const split = filename.split('_');

            if (split.length !== 2) {
                return true;
            }

            try {
                const date = +new Date(parseInt(split[split.length - 1]));
                const aDayInMilSec = 24 * 60 * 60 * 1000;

                const now = +new Date();
                return now - date > aDayInMilSec;
            } catch (e) {
                return true;
            }
        });

        // 내부 함수 병렬처리후 완료되면 값 반환
        await Promise.all(
            deleteFilesTargets.map((x) =>
                unlink(join(process.cwd(), 'public', 'temp', x)),
            ),
        );
    }

    @Cron('0 * * * * *')
    async caculateMovieLikeCounts() {
        console.log('run');

        await this.movieRepository.query(
            `
            UPDATE movie m
            SET "likeCount" = (
                SELECT COUNT(*) FROM movie_user_like mul
                WHERE mul."movieId" = m.id AND mul."isLike" = true
            )
            `,
        );

        await this.movieRepository.query(
            `
            UPDATE movie m
            SET "dislikeCount" = (
                SELECT COUNT(*) FROM movie_user_like mul
                WHERE m.id = mul."movieId" AND mul."isLike" = false
            )
            `,
        );
    }
}
