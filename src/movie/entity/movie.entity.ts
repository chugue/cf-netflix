import { Exclude, Transform } from 'class-transformer';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';
import { BaseTable } from '../../common/entity/base-table.entity';
import { MovieDetail } from './movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { MovieFilePipe } from '../pipe/movie-file.pipe';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './movie-user-like.entity';

@Entity()
export class Movie extends BaseTable {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.createdMovies, {
        cascade: true,
        nullable: true,
    })
    creator: User;

    @Column({
        unique: true,
    })
    title: string;

    @ManyToMany(() => Genre, (genre) => genre.movies)
    @JoinTable()
    genres: Genre[];

    @Column({
        default: 0,
    })
    likeCount: number;

    @Column({
        default: 0,
    })
    dislikeCount: number;

    @OneToOne(() => MovieDetail, (movieDetail) => movieDetail.movie, {
        cascade: true,
    })
    @JoinColumn()
    detail: MovieDetail;

    @Column()
    @Transform(({ value }) =>
        process.env.ENV === 'prod'
            ? `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${value}`
            : `http://localhost:3000/${value}`,
    )
    movieFilePath: string;

    @ManyToOne(() => Director, (director) => director.id, {
        cascade: true,
        nullable: false,
    })
    director: Director;

    @OneToMany(() => MovieUserLike, (movieUserLike) => movieUserLike.movie)
    likedUsers: MovieUserLike[];
}
