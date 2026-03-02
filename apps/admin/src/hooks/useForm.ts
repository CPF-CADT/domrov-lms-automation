import { useState, useCallback } from 'react';

interface FormState {
    [key: string]: any;
}

interface FormErrors {
    [key: string]: string;
}

interface UseFormReturn<T extends FormState> {
    values: T;
    errors: FormErrors;
    isSubmitting: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e: React.FormEvent) => Promise<void>;
    setFieldValue: (field: string, value: any) => void;
    setFieldError: (field: string, error: string) => void;
    resetForm: () => void;
    setErrors: (errors: FormErrors) => void;
}

export const useForm = <T extends FormState>(
    initialValues: T,
    onValidate?: (values: T) => FormErrors
): UseFormReturn<T> => {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value, type } = e.target;
            const fieldValue =
                type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

            setValues((prev) => ({
                ...prev,
                [name]: fieldValue,
            }));

            if (errors[name]) {
                setErrors((prev) => ({
                    ...prev,
                    [name]: '',
                }));
            }
        },
        [errors]
    );

    const setFieldValue = useCallback((field: string, value: any) => {
        setValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const setFieldError = useCallback((field: string, error: string) => {
        setErrors((prev) => ({
            ...prev,
            [field]: error,
        }));
    }, []);

    const handleSubmit = useCallback(
        (onSubmit: (values: T) => Promise<void> | void) =>
            async (e: React.FormEvent) => {
                e.preventDefault();

                if (onValidate) {
                    const validationErrors = onValidate(values);
                    setErrors(validationErrors);
                    if (Object.keys(validationErrors).length > 0) {
                        return;
                    }
                }

                setIsSubmitting(true);
                try {
                    await onSubmit(values);
                } catch (error) {
                    console.error('Form submission error:', error);
                } finally {
                    setIsSubmitting(false);
                }
            },
        [values, onValidate]
    );

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setIsSubmitting(false);
    }, [initialValues]);

    return {
        values,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        setFieldValue,
        setFieldError,
        resetForm,
        setErrors,
    };
};
