import { Exclude } from 'class-transformer';
import { ChatRoom } from 'src/chat/entity/chat-room.entity';
import { Chat } from 'src/chat/entity/chat.entity';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { MovieUserLike } from 'src/movie/entity/movie-user-like.entity';
import { Movie } from 'src/movie/entity/movie.entity';
import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum Role {
    ADMIN,
    USER,
    PAID_USER,
}

@Entity()
export class User extends BaseTable {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
    })
    email: string;

    @Column()
    @Exclude({
        toPlainOnly: true,
    })
    password: string;

    @Column({
        enum: Role,
        default: Role.USER,
    })
    role: Role;

    @OneToMany(() => Movie, (movie) => movie.creator)
    createdMovies: Movie[];

    @OneToMany(() => MovieUserLike, (movieUserLike) => movieUserLike.user)
    likedMovies: MovieUserLike[];

    @OneToMany(() => Chat, (chat) => chat.author)
    chats: Chat[];

    @ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.users)
    chatRooms: ChatRoom[];
}
