## API Integration Guide

This guide explains how to connect your services to real backend APIs.

---

## Current State

Services currently use **mock data** with simulated Promise-based async:

```typescript
// Current mock implementation
export const userService = {
  fetchUsers: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockUsers), 1000);
    });
  },
};
```

---

## Step 1: Set Up API Client

Create a new file: `src/services/apiClient.ts`

```typescript
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { query?: Record<string, any> } = {},
  ): Promise<T> {
    const { query, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;

    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)]),
      ).toString();
      url += `?${queryString}`;
    }

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    };

    const config: RequestInit = {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...fetchOptions.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = (await response.json()) as ApiError;
        throw {
          message: error.message || `HTTP ${response.status}`,
          status: response.status,
          code: error.code,
        };
      }

      if (response.status === 204) {
        return null as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("Network error. Check your connection.");
      }
      throw error;
    }
  }

  get<T>(endpoint: string, query?: Record<string, any>) {
    return this.request<T>(endpoint, { method: "GET", query });
  }

  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
```

---

## Step 2: Update Environment Variables

Create `.env` file (or `.env.local` for local overrides):

```env
# Development
VITE_API_BASE_URL=http://localhost:3000/api

# Staging
# VITE_API_BASE_URL=https://staging-api.example.com/api

# Production
# VITE_API_BASE_URL=https://api.example.com/api
```

Add to `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Step 3: Update Services

### Example: userService.ts

**Before (Mock):**

```typescript
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', ... },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', ... },
];

export const userService = {
  fetchUsers: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockUsers), 1000);
    });
  }
}
```

**After (API):**

```typescript
import { apiClient } from "./apiClient";
import { User } from "../types";

export const userService = {
  fetchUsers: async (page?: number, limit?: number): Promise<User[]> => {
    return apiClient.get<User[]>("/users", { page, limit });
  },

  fetchUserById: async (id: string): Promise<User> => {
    return apiClient.get<User>(`/users/${id}`);
  },

  createUser: async (data: Omit<User, "id" | "createdAt">): Promise<User> => {
    return apiClient.post<User>("/users", data);
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    return apiClient.put<User>(`/users/${id}`, data);
  },

  deleteUser: async (id: string): Promise<void> => {
    return apiClient.delete(`/users/${id}`);
  },

  toggleUserStatus: async (id: string): Promise<User> => {
    return apiClient.patch<User>(`/users/${id}/toggle-status`);
  },
};
```

---

## Step 4: Update All Services

### creditPackageService.ts

```typescript
import { apiClient } from "./apiClient";
import { CreditPackage } from "../types";

export const creditPackageService = {
  fetchPackages: async (): Promise<CreditPackage[]> => {
    return apiClient.get<CreditPackage[]>("/credit-packages");
  },

  fetchPackageById: async (id: string): Promise<CreditPackage> => {
    return apiClient.get<CreditPackage>(`/credit-packages/${id}`);
  },

  createPackage: async (
    data: Omit<CreditPackage, "id" | "createdAt">,
  ): Promise<CreditPackage> => {
    return apiClient.post<CreditPackage>("/credit-packages", data);
  },

  updatePackage: async (
    id: string,
    data: Partial<CreditPackage>,
  ): Promise<CreditPackage> => {
    return apiClient.put<CreditPackage>(`/credit-packages/${id}`, data);
  },

  deletePackage: async (id: string): Promise<void> => {
    return apiClient.delete(`/credit-packages/${id}`);
  },

  togglePackageStatus: async (id: string): Promise<CreditPackage> => {
    return apiClient.patch<CreditPackage>(
      `/credit-packages/${id}/toggle-status`,
    );
  },
};
```

### transactionService.ts

```typescript
import { apiClient } from "./apiClient";
import { Transaction } from "../types";

export const transactionService = {
  fetchTransactions: async (
    page?: number,
    limit?: number,
  ): Promise<Transaction[]> => {
    return apiClient.get<Transaction[]>("/transactions", { page, limit });
  },

  fetchTransactionById: async (id: string): Promise<Transaction> => {
    return apiClient.get<Transaction>(`/transactions/${id}`);
  },

  retryTransaction: async (id: string): Promise<Transaction> => {
    return apiClient.post<Transaction>(`/transactions/${id}/retry`);
  },
};
```

### evaluationService.ts

```typescript
import { apiClient } from "./apiClient";
import { Evaluation } from "../types";

export const evaluationService = {
  fetchEvaluations: async (
    page?: number,
    limit?: number,
  ): Promise<Evaluation[]> => {
    return apiClient.get<Evaluation[]>("/evaluations", { page, limit });
  },

  fetchEvaluationById: async (id: string): Promise<Evaluation> => {
    return apiClient.get<Evaluation>(`/evaluations/${id}`);
  },
};
```

---

## Step 5: Authentication Handling

Create a new file: `src/services/authService.ts`

```typescript
import { apiClient } from "./apiClient";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });

    // Store token
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }

    return response;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
    localStorage.removeItem("auth_token");
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/refresh");

    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }

    return response;
  },

  getCurrentUser: async () => {
    return apiClient.get("/auth/me");
  },
};
```

---

## Step 6: Update Login Page

Update `src/pages/Login.tsx`:

```typescript
import { authService } from '../services';

export default function Login() {
  const navigate = useNavigate();
  const form = useForm<LoginFormData>(
    { email: '', password: '' },
    {
      email: (value) => validateEmail(value),
      password: (value) => validatePassword(value),
    }
  );

  const handleLogin = async (data: LoginFormData) => {
    try {
      const response = await authService.login(data.email, data.password);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/dashboard');
    } catch (error) {
      form.setError('general', (error as Error).message);
    }
  };

  return (
    // ... JSX remains the same, just use authService
  );
}
```

---

## Step 7: Error Handling

Create a new file: `src/utils/errorHandler.ts`

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unexpected error occurred";
}

export function handleApiError(error: unknown) {
  const message = getErrorMessage(error);

  // Log to monitoring service
  console.error("API Error:", message);

  // Could integrate with error tracking service like Sentry
  // Sentry.captureException(error);

  return message;
}
```

---

## Step 8: Interceptor for Token Refresh

Enhance `apiClient.ts` with token refresh:

```typescript
// In apiClient.ts request method
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // ... existing code ...

  try {
    const response = await fetch(url, config);

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      try {
        // Try to refresh token
        const newAuth = await this.refreshToken();
        // Retry request with new token
        return this.request<T>(endpoint, options);
      } catch {
        // Redirect to login
        localStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    // ... rest of error handling ...
  } catch (error) {
    // ... error handling ...
  }
}

private async refreshToken(): Promise<{ token: string }> {
  const response = await fetch(`${this.baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const data = await response.json();
  localStorage.setItem('auth_token', data.token);

  return data;
}
```

---

## Expected API Endpoints

### Users

```
GET    /api/users              # List all users
GET    /api/users/:id          # Get single user
POST   /api/users              # Create user
PUT    /api/users/:id          # Update user
DELETE /api/users/:id          # Delete user
PATCH  /api/users/:id/toggle-status  # Toggle user status
```

### Credit Packages

```
GET    /api/credit-packages               # List packages
GET    /api/credit-packages/:id           # Get single package
POST   /api/credit-packages               # Create package
PUT    /api/credit-packages/:id           # Update package
DELETE /api/credit-packages/:id           # Delete package
PATCH  /api/credit-packages/:id/toggle-status # Toggle status
```

### Transactions

```
GET    /api/transactions       # List transactions
GET    /api/transactions/:id   # Get single transaction
POST   /api/transactions/:id/retry # Retry transaction
```

### Evaluations

```
GET    /api/evaluations        # List evaluations
GET    /api/evaluations/:id    # Get single evaluation
```

### Authentication

```
POST   /api/auth/login         # Login
POST   /api/auth/logout        # Logout
POST   /api/auth/refresh       # Refresh token
GET    /api/auth/me            # Get current user
```

---

## Testing API Calls

### Using curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get users
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create package
curl -X POST http://localhost:3000/api/credit-packages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Package A","credits":100,"price":9.99}'
```

### Using Postman

1. Create Postman collection
2. Set base URL variable: `{{base_url}}`
3. Auth: Set token in Headers: `Authorization: Bearer {{token}}`
4. Create requests for each endpoint
5. Test with real API responses

---

## Migration Checklist

- [ ] Create apiClient.ts
- [ ] Add environment variables (.env files)
- [ ] Update userService to use apiClient
- [ ] Update creditPackageService
- [ ] Update transactionService
- [ ] Update evaluationService
- [ ] Create authService
- [ ] Update Login.tsx to use authService
- [ ] Add token refresh logic to apiClient
- [ ] Add error handling utilities
- [ ] Test each endpoint with curl/Postman
- [ ] Verify loading states work
- [ ] Check error messages display correctly
- [ ] Test on staging environment
- [ ] Monitor API calls in browser DevTools

---

## Common Issues & Solutions

### Issue: "CORS error"

**Solution**: Backend needs to allow your frontend URL in CORS headers

```
Access-Control-Allow-Origin: http://localhost:5173
```

### Issue: "Unauthorized (401)"

**Solution**: Token missing or expired

- Check localStorage has 'auth_token'
- Implement token refresh logic
- Add auth token to all requests

### Issue: "404 Not Found"

**Solution**: Wrong endpoint path

- Verify API_BASE_URL is correct
- Check endpoint path matches backend routes
- Use Network tab in DevTools to see actual URL

### Issue: "Timeout"

**Solution**: API too slow or no response

- Increase timeout in apiClient
- Check backend is running
- Verify network connection

---

## Performance Tips

1. **Pagination**: Always use pagination for large datasets
2. **Caching**: Cache API responses in localStorage when appropriate
3. **Debouncing**: Debounce search/filter requests
4. **Lazy Loading**: Only load data when needed
5. **Batch Requests**: Combine multiple requests into one if possible

---

**Next Steps:**

1. Set up backend server with these endpoints
2. Follow this guide to migrate services
3. Test each API call thoroughly
4. Deploy to staging for QA
5. Monitor performance in production
