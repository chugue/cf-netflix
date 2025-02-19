import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PagePaginationDto } from './dto/page-pagination.dto';
import { SelectQueryBuilder } from 'typeorm';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectCannedACL, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class CommonService {
    private s3: S3;

    constructor() {
        this.s3 = new S3({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },

            region: process.env.AWS_REGION,
        });
    }

    async saveMovieToPermanentStorage(filename: string) {
        try {
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            await this.s3.copyObject({
                Bucket: bucketName,
                CopySource: `${bucketName}/public/temp/${filename}`,
                Key: `public/movie/${filename}`,
                ACL: 'public-read',
            });

            await this.s3.deleteObject({
                Bucket: bucketName,
                Key: `public/temp/${filename}`,
            });
        } catch (e) {
            console.log(e);
            throw new InternalServerErrorException('S3 에러!!');
        }
    }

    async createPresignedUrl(expiresIn = 300) {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `public/temp/${uuidv4()}.mp4`,
            ACL: ObjectCannedACL.public_read,
        };
        try {
            const url = await getSignedUrl(this.s3, new PutObjectCommand(params), {
                expiresIn,
            });
            return url;
        } catch (e) {
            console.log(e);
            throw new InternalServerErrorException('S3 PresignedUrl 생성 실패');
        }
    }

    applyPagePaginationParamsToQb<T>(qb: SelectQueryBuilder<T>, dto: PagePaginationDto) {
        const { page, take } = dto;
        const skip = (page - 1) * take;
        qb.take(take).skip(skip);
    }

    async applyCursorPaginationParamsToQb<T>(qb: SelectQueryBuilder<T>, dto: CursorPaginationDto) {
        let { cursor, order, take } = dto;

        if (cursor) {
            const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
            /**
             * {
             *  values: {
             *    id: 1
             *  },
             * order: ['id_DESC']
             * }
             */
            const cursorObj = JSON.parse(decodedCursor);
            order = cursorObj.order;

            const { values } = cursorObj;
            // WHERE (column1, > value1)
            // OR       (column1 = value 1 AND column2 < value2)
            // OR       (column1 = value 1 AND column2 = value2 AND column3 < value3)
            // (movie.column1, movie.column2, movie.column3) > (:value1, :value2, :value3)
            const columns = Object.keys(values);
            const comparisonOperator = order.some((o) => o.endsWith('DESC')) ? '<' : '>';
            const whereConditions = columns.map((c) => `${qb.alias}.${c}`).join(',');
            const whereParams = columns.map((c) => `:${c}`).join(',');

            qb.where(`(${whereConditions}) ${comparisonOperator} (${whereParams})`, values);
        }

        // [ "likeCount_DESC", "id_ASC"  ]
        for (let i = 0; i < order.length; i++) {
            const [column, direction] = order[i].split('_');

            if (direction !== 'ASC' && direction !== 'DESC') {
                throw new BadRequestException('Order는 ASC 또는 DESC으로 입력해주세요!');
            }

            if (i === 0) {
                qb.orderBy(`${qb.alias}.${column}`, direction);
            } else {
                qb.addOrderBy(`${qb.alias}.${column}`, direction);
            }
        }

        qb.take(take);
        const results = await qb.getMany();
        const nextCursor = this.generateNextCursor(results, order);

        return { qb, nextCursor };
    }

    generateNextCursor<T>(results: T[], order: string[]): string | null {
        if (results.length === 0) return null;

        /**
         * {
         *  values: {
         *    id: 1
         *  },
         * order: ['id_DESC']
         * }
         */

        const lastItem = results[results.length - 1];

        const values = {};

        order.forEach((columnOrder) => {
            const [column] = columnOrder.split('_');
            values[column] = lastItem[column];
        });
        const cursorObj = { values, order };
        const nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');

        return nextCursor;
    }
}
