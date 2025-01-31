import { IsEmail, IsString } from 'class-validator';
import { User } from '../entities/user.entity';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}
