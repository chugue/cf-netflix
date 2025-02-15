import { PartialType } from '@nestjs/swagger';
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { CreateMovieDto } from './create-movie.dto';

@ValidatorConstraint({
    async: true,
})
class PasswordValidator implements ValidatorConstraintInterface {
    validate(
        value: any,
        validationArguments?: ValidationArguments,
    ): Promise<boolean> | boolean {
        return value.length > 3 && value.length < 8;
    }
    defaultMessage?(validationArguments?: ValidationArguments): string {
        return `비밀번호의 길이는 4~8자 이어야 합니다. (${validationArguments?.value})`;
    }
}

function IsPasswordValid(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: PasswordValidator,
        });
    };
}

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}
