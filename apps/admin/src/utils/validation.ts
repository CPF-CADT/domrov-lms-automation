// Validation utilities

import { FORM_VALIDATION } from '../constants/config';

export const validateEmail = (email: string): boolean => {
    return FORM_VALIDATION.EMAIL_REGEX.test(email);
};

export const validatePassword = (password: string): boolean => {
    return password.length >= FORM_VALIDATION.MIN_PASSWORD_LENGTH;
};

export const validatePhone = (phone: string): boolean => {
    return FORM_VALIDATION.PHONE_REGEX.test(phone);
};

export const validateNotEmpty = (value: string): boolean => {
    return value.trim().length > 0;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
    return value.length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
    return value.length <= maxLength;
};

export const validateNumber = (value: number, min?: number, max?: number): boolean => {
    if (isNaN(value)) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
};

export const validatePositiveNumber = (value: number): boolean => {
    return value > 0;
};

export const getValidationError = (
    value: string,
    field: string,
    rules?: { minLength?: number; maxLength?: number; required?: boolean }
): string | null => {
    if (rules?.required && !validateNotEmpty(value)) {
        return `${field} is required`;
    }
    if (rules?.minLength && !validateMinLength(value, rules.minLength)) {
        return `${field} must be at least ${rules.minLength} characters`;
    }
    if (rules?.maxLength && !validateMaxLength(value, rules.maxLength)) {
        return `${field} must not exceed ${rules.maxLength} characters`;
    }
    return null;
};
