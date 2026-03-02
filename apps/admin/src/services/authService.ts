// src/services/authService.ts
import { apiClient } from './api';

interface LoginCredentials {
    email: string;
    password: string;
}

const authService = {
    login: (credentials: LoginCredentials) =>
        apiClient.auth.login(credentials),

    logout: () =>
        apiClient.auth.logout(),

    getProfile: () =>
        apiClient.auth.getProfile(),
};

export default authService;
