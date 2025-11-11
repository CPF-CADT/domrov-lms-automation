import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import * as dns from 'dns/promises';
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
export function IsRealEmailDomain(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isRealEmailDomain',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(value: any, _args: ValidationArguments) {
          if (!value || typeof value !== 'string') return false;
          const [, domain] = value.split('@');
          if (!domain) return false;

          try {
            const records = await dns.resolveMx(domain);
            return records && records.length > 0;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return 'Email domain does not appear to exist or cannot receive mail.';
        },
      },
    });
  };
}
