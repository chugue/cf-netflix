import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTable } from '../../common/entity/base-table.entity';
import { Movie } from 'src/movie/entity/movie.entity';

@Entity()
export class Genre extends BaseTable {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
    })
    name: string;

    @ManyToMany(() => Movie, (movie) => movie.genres, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    movies: Movie[];
}
