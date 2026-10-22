import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { STORAGE_KEYS, storage } from '@/lib/Storage';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Let the browser set multipart/form-data with its boundary. Keeping
        // the JSON default here causes Multer to receive no `file` part.
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            if (typeof config.headers.delete === 'function') {
                config.headers.delete('Content-Type');
            } else {
                delete config.headers['Content-Type'];
            }
        }
        const token = storage.get(STORAGE_KEYS.token);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<{ message?: string }>) => {
        const message =
            error?.response?.data?.message || error?.message || 'Unknown API error';
        return Promise.reject(new Error(message));
    }
);

export default axiosInstance;
