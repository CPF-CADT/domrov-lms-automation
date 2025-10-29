import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsPasswordConfirmed(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'isPasswordConfirmed',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value === (args.object as any).password;
                },
            },
        });
    };
}
