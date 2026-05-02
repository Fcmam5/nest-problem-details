import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';

// Custom validator example: ensures value is not 'admin'
function IsNotReservedUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsNotReservedUsername',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && value.toLowerCase() !== 'admin';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} "${args.value}" is a reserved username`;
        },
      },
    });
  };
}

// Nested DTO
export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;
}

// Root DTO — flat fields + nested object + custom validator
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @IsNotReservedUsername()
  username!: string;

  @IsEmail()
  email!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
