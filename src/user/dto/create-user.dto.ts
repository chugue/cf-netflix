import { IsEmail, IsString } from 'class-validator';
import { User } from '../entity/user.entity';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}
