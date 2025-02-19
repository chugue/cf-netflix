import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { readdir, unlink } from 'fs/promises';
import { join, parse } from 'path';
import { Movie } from 'src/movie/entity/movie.entity';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TasksService {
    // private readonly logger = new Logger(TasksService.name);

    constructor(
        @InjectRepository(Movie)
        private readonly movieRepository: Repository<Movie>,
        private readonly schedulerRegistry: SchedulerRegistry,
        // private readonly logger: DefaultLogger,
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ) {}

    // @Cron('*/5 * * * * *')
    logEverySecond() {
        this.logger.fatal('FATAL 레벨 로그', null, TasksService.name); // 당장 해결해야되는 문제
        this.logger.error('ERROR 레벨 로그', null, TasksService.name); // 운영환경 문제가 있음
        this.logger.warn('WARN 레벨 로그', TasksService.name); // 운영환경 문제는 없지만, 문제가 있을 수 있음
        this.logger.log('LOG 레벨 로그', TasksService.name); // 운영 환경 중요한 정보 INFO 레벨
        this.logger.debug('DEBUG 레벨 로그', TasksService.name); // 개발 환경 중요한 정보
        this.logger.verbose('VERBOSE 레벨 로그', TasksService.name); // 중요하지 않지만 알고싶은 정보 로그
    }

    // @Cron('* * * * * *')
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
            deleteFilesTargets.map((x) => unlink(join(process.cwd(), 'public', 'temp', x))),
        );
    }

    // @Cron('0 * * * * *')
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

    // @Cron('* * * * * *', {
    //     name: 'printer',
    // })
    printer() {
        console.log('print every second');
    }

    // @Cron('*/5 * * * * *')
    stopper() {
        console.log('--- stopper run ---');

        const job = this.schedulerRegistry.getCronJob('printer');

        // console.log('# Last Date');
        // console.log(job.lastDate());
        // console.log('# Next Date');
        // console.log(job.nextDate());
        // console.log('# Next Dates');
        // console.log(job.nextDates(5));

        if (job.running) {
            job.stop();
        } else {
            job.start();
        }
    }
}
