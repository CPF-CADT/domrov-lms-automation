import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: 'IsAfterStartDate', async: false })
export class IsAfterStartDate implements ValidatorConstraintInterface {
    validate(dueDate: Date, args: ValidationArguments) {
        const obj = args.object as any;
        if (!obj.startDate || !dueDate) return true;
        return new Date(dueDate) > new Date(obj.startDate);
    }

    defaultMessage() {
        return 'dueDate must be after startDate';
    }
}