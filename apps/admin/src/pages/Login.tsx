import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseButton, BaseInput } from '../components/base';
import { useForm } from '../hooks';
import { validateEmail, validatePassword } from '../utils';
import { useAuth } from '../context/authContext';
import { APP_NAME } from '../constants/config';

interface LoginFormValues {
    email: string;
    password: string;
}

const Login = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    if (isAuthenticated) {
        window.location.href = '/';
    }

    const { values, errors, handleChange, setFieldError, resetForm } =
        useForm<LoginFormValues>(
            {
                email: '',
                password: '',
            },
            (values) => {
                const errors: { email?: string; password?: string } = {};

                if (!values.email) {
                    errors.email = 'Email is required';
                } else if (!validateEmail(values.email)) {
                    errors.email = 'Invalid email address';
                }

                if (!values.password) {
                    errors.password = 'Password is required';
                } else if (!validatePassword(values.password)) {
                    errors.password =
                        'Password must be at least 8 characters long';
                }

                return errors;
            }
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError(null);

        // Validate
        if (!values.email || !validateEmail(values.email)) {
            setFieldError('email', 'Invalid email address');
            return;
        }
        if (!values.password || !validatePassword(values.password)) {
            setFieldError('password', 'Password must be at least 8 characters');
            return;
        }

        try {
            setIsSubmitting(true);
            await login({ email: values.email, password: values.password });
            resetForm();
            navigate('/');
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Login failed. Please try again.';
            setGeneralError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
            <div className="w-full max-w-md px-4">
                <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <LogIn className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
                        {APP_NAME}
                    </h1>
                    <p className="text-center text-gray-600 text-sm mb-8">
                        Sign in to your admin account
                    </p>

                    {generalError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {generalError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <BaseInput
                            label="Email Address"
                            name="email"
                            type="email"
                            value={values.email}
                            onChange={handleChange}
                            error={errors.email}
                            placeholder="admin@example.com"
                            required
                            fullWidth
                        />

                        <BaseInput
                            label="Password"
                            name="password"
                            type="password"
                            value={values.password}
                            onChange={handleChange}
                            error={errors.password}
                            placeholder="••••••••"
                            required
                            fullWidth
                        />

                        <BaseButton
                            variant="primary"
                            size="md"
                            type="submit"
                            isLoading={isSubmitting}
                            fullWidth
                        >
                            Sign In
                        </BaseButton>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
