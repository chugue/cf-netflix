import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chat-room.entity';
import { Chat } from './entity/chat.entity';
import { User } from 'src/user/entity/user.entity';

@Module({
    imports: [AuthModule, TypeOrmModule.forFeature([ChatRoom, Chat, User])],
    providers: [ChatGateway, ChatService],
})
export class ChatModule {}
