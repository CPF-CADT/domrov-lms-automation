## Development Setup & Contribution Guide

---

## Project Setup

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+ or yarn 3+
- Git
- VSCode with recommended extensions

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd domrov-lms-automation/apps/admin
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API base URL
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Format code (if prettier is set up)
npm run format

# Run tests (when added)
npm run test
```

---

## VSCode Extensions

**Recommended**:

- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin
- Prettier - Code formatter
- ESLint
- Thunder Client (or REST Client)

**Install**: Click the "Extensions" icon in VSCode sidebar, search for each, and click Install.

---

## Code Structure Overview

```
src/
├── pages/                  # Full page components
│   ├── Login.tsx          # Authentication page
│   ├── Dashboard.tsx      # Main dashboard
│   ├── Users.tsx          # User management
│   ├── CreditPackages.tsx # Package management
│   ├── Transactions.tsx   # Transaction history
│   └── Evaluations.tsx    # Evaluation results
│
├── components/            # Reusable components
│   ├── base/             # Base UI components (Button, Input, etc)
│   ├── dashboard/        # Dashboard-specific components
│   ├── layout/           # Layout components (MainLayout, etc)
│   ├── users/            # User-related components
│   ├── transactions/     # Transaction-related components
│   └── evaluations/      # Evaluation-related components
│
├── services/             # Data layer
│   ├── userService.ts
│   ├── creditPackageService.ts
│   ├── transactionService.ts
│   └── evaluationService.ts
│
├── hooks/                # Custom React hooks
│   ├── useForm.ts        # Form state management
│   ├── useFilter.ts      # Data filtering
│   ├── usePagination.ts  # Pagination logic
│   └── useModal.ts       # Modal state management
│
├── utils/                # Utility functions
│   ├── formatters.ts     # Data formatting
│   ├── validation.ts     # Form validation
│   └── classNames.ts     # CSS class utilities
│
├── constants/            # App constants
│   └── config.ts         # Routes, colors, status types
│
├── types/                # TypeScript definitions
│   └── index.ts
│
├── App.tsx               # Main app router
└── main.tsx              # Entry point
```

---

## Adding a New Feature

### Example: Adding a Delete Confirmation Modal

**Step 1**: Create the modal component (or reuse BaseModal)

```typescript
// src/components/shared/ConfirmDeleteModal.tsx
import { BaseButton } from '../base';
import { BaseModal } from '../base';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2 justify-end">
          <BaseButton
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Delete
          </BaseButton>
        </div>
      }
    >
      <p className="text-neutral-600">{message}</p>
    </BaseModal>
  );
}
```

**Step 2**: Use in your page component

```typescript
// In Users.tsx or any page
import { useModal } from '../hooks';
import ConfirmDeleteModal from '../components/shared/ConfirmDeleteModal';

export default function Users() {
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    deleteModal.openModal();
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await userService.deleteUser(deletingId);
      setUsers(users.filter(u => u.id !== deletingId));
      deleteModal.closeModal();
    } catch (error) {
      setError('Failed to delete user');
    }
  };

  return (
    <>
      {/* Your existing JSX */}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={deleteModal.closeModal}
        isLoading={deletingId !== null}
      />
    </>
  );
}
```

---

## Creating a New Service

### Example: Adding reportService

**Step 1**: Create the service file

```typescript
// src/services/reportService.ts
import { apiClient } from "./apiClient";

export interface Report {
  id: string;
  name: string;
  type: "user" | "transaction" | "evaluation";
  generatedAt: string;
  url: string;
}

export const reportService = {
  fetchReports: async (): Promise<Report[]> => {
    return apiClient.get<Report[]>("/reports");
  },

  generateReport: async (type: Report["type"]): Promise<Report> => {
    return apiClient.post<Report>("/reports/generate", { type });
  },

  downloadReport: async (id: string): Promise<Blob> => {
    return apiClient.get<Blob>(`/reports/${id}/download`);
  },

  deleteReport: async (id: string): Promise<void> => {
    return apiClient.delete(`/reports/${id}`);
  },
};
```

**Step 2**: Export from services index

```typescript
// src/services/index.ts
export * from "./userService";
export * from "./creditPackageService";
export * from "./transactionService";
export * from "./evaluationService";
export * from "./reportService"; // Add this
```

**Step 3**: Use in your page

```typescript
import { reportService } from "../services";

// In component
const [reports, setReports] = useState<Report[]>([]);

useEffect(() => {
  loadReports();
}, []);

const loadReports = async () => {
  try {
    const data = await reportService.fetchReports();
    setReports(data);
  } catch (error) {
    setError("Failed to load reports");
  }
};
```

---

## Creating a Custom Hook

### Example: useAsync Hook for Data Fetching

```typescript
// src/hooks/useAsync.ts
import { useEffect, useState, useCallback } from "react";

interface UseAsyncState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(asyncFunction: () => Promise<T>, immediate = true) {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const response = await asyncFunction();
      setState({ status: "success", data: response, error: null });
    } catch (error) {
      setState({
        status: "error",
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute };
}

// Usage in component:
const {
  data: users,
  status,
  error,
  execute,
} = useAsync(() => userService.fetchUsers(), true);
```

---

## Writing Tests

### Component Test Example

```typescript
// src/components/base/BaseButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaseButton from './BaseButton';

describe('BaseButton', () => {
  it('renders button with text', () => {
    render(<BaseButton>Click me</BaseButton>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<BaseButton onClick={handleClick}>Click me</BaseButton>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('disables button when disabled prop is true', () => {
    render(<BaseButton disabled>Click me</BaseButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<BaseButton isLoading>Loading</BaseButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## Code Style & Conventions

### File Naming

- **Components**: PascalCase (UserTable.tsx, BaseButton.tsx)
- **Services**: camelCase + Service (userService.ts)
- **Hooks**: camelCase starting with 'use' (useForm.ts)
- **Utils**: camelCase (formatters.ts, validation.ts)
- **Types**: interfaces in PascalCase (User, CreditPackage)

### Component Structure

```typescript
// src/components/[Feature]/ComponentName.tsx

import { ReactNode } from 'react';
import { Icon } from 'lucide-react';
import { BaseButton } from '../base';
import { useForm } from '../../hooks';
import { formatCurrency } from '../../utils/formatters';
import { STATUS_COLORS } from '../../constants';
import { User } from '../../types';

interface ComponentNameProps {
  title: string;
  data: User[];
  onSubmit: (user: User) => void;
}

/**
 * ComponentName - Brief description
 *
 * Detailed description of what this component does,
 * how it's used, and any important props.
 */
export default function ComponentName({
  title,
  data,
  onSubmit,
}: ComponentNameProps) {
  // Hooks at the top
  const form = useForm({...});

  // State
  const [isLoading, setIsLoading] = useState(false);

  // Effects
  useEffect(() => {
    // Load data
  }, []);

  // Handlers
  const handleSubmit = async (values) => {
    // Handle submission
  };

  // Render
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {/* JSX content */}
    </div>
  );
}
```

### Styling Rules

- Use Tailwind CSS classes (no inline styles)
- Use `classNames` utility for conditional styles
- Follow consistent spacing: use rem/px multiples defined in config
- No hardcoded colors: use Tailwind color palette
- Icons from lucide-react only (no emoji)

### Type Safety

- Always define prop interfaces for components
- Use proper TypeScript types for function parameters
- Avoid `any` type
- Export types from types/index.ts for reusability

---

## Debugging Tips

### Using React DevTools

1. Install React DevTools browser extension
2. Open DevTools > Components tab
3. Inspect component props, state, hooks
4. Use "Highlight updates" to see re-renders

### Using Vue DevTools for Hooks

1. Check hook values in Components tab
2. Track how state changes with actions
3. See component tree and hierarchy

### Network Debugging

1. Open DevTools > Network tab
2. Check API requests/responses
3. Verify correct endpoints and headers
4. Check response times and errors

### Using Console

```javascript
// Check environment variables
console.log(import.meta.env.VITE_API_BASE_URL);

// Log component props
console.log("Props:", props);

// Check localStorage
console.log(localStorage.getItem("auth_token"));

// Test API calls
const res = await fetch("/api/users");
console.log(await res.json());
```

---

## Performance Optimization

### Prevent Unnecessary Re-renders

```typescript
// Use React.memo for components that don't need frequent re-renders
export default React.memo(UserRow);

// Use useCallback for function stability
const handleDelete = useCallback((id: string) => {
  deleteUser(id);
}, []);

// Use useMemo for expensive computations
const filteredUsers = useMemo(() => {
  return users.filter((u) => u.name.includes(search));
}, [users, search]);
```

### Debouncing Search

```typescript
// In useFilter hook or component
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useMemo(
  () => debounce((term: string) => setSearchTerm(term), 300),
  []
);

return <input onChange={(e) => debouncedSearch(e.target.value)} />;
```

---

## Common Mistakes to Avoid

1. ❌ **Hardcoding values** → ✅ Use constants/config.ts
2. ❌ **Missing error handling** → ✅ Always use try/catch
3. ❌ **Inline styles** → ✅ Use Tailwind utilities
4. ❌ **Type as 'any'** → ✅ Define proper types
5. ❌ **No loading states** → ✅ Show feedback to user
6. ❌ **Duplicate code** → ✅ Create reusable components/hooks
7. ❌ **Mixing concerns** → ✅ Keep business logic in services
8. ❌ **No prop validation** → ✅ Define interfaces for all props
9. ❌ **Console.log in production** → ✅ Remove before committing
10. ❌ **Forgetting dependencies in useEffect** → ✅ Always add dependencies

---

## Git Workflow

### Branch Naming

```
feature/add-reports-page
bugfix/fix-user-delete
refactor/improve-performance
style/update-colors
```

### Commit Messages

```
feat: add user deletion confirmation modal
fix: prevent duplicate form submissions
refactor: extract common validation logic
style: update breadcrumb styling
docs: update API integration guide
```

### Before Committing

```bash
# Run linter
npm run lint

# Check for console.log statements
grep -r "console\." src/ --exclude-dir=node_modules

# Remove unused imports
# (Many IDEs do this automatically)

# Test your changes
npm run dev
# Manually test affected features
```

---

## Deployment

### Production Build

```bash
npm run build
# Creates optimized build in dist/ folder
```

### Deployment Platforms

- **Netlify**: Drag & drop dist/ or connect Git
- **Vercel**: Connect Git repo, auto-deploys on push
- **GitHub Pages**: Configure in package.json and GitHub settings
- **Traditional Server**: Upload dist/ to web server

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Performance tested with production build
- [ ] Responsive design checked on mobile
- [ ] Accessibility checked
- [ ] All features tested end-to-end

---

## Resources & Learning

### Official Documentation

- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router](https://reactrouter.com)
- [Lucide Icons](https://lucide.dev)

### Tools & Libraries

- [Vite](https://vitejs.dev) - Build tool
- [Prettier](https://prettier.io) - Code formatter
- [ESLint](https://eslint.org) - Linter
- [Vitest](https://vitest.dev) - Test framework

### Learning Resources

- [React Patterns](https://www.patterns.dev/posts/react-patterns)
- [SOLID Principles](https://www.freecodecamp.org/news/solid-principles-explained-in-plain-english/)
- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)

---

## Getting Help

1. **Check existing documentation** in REFACTORING_GUIDE.md and API_INTEGRATION_GUIDE.md
2. **Search codebase** for similar examples
3. **Check component props** by hovering in VSCode
4. **Review browser DevTools** for errors
5. **Check API responses** in Network tab
6. **Ask team members** for context on specific decisions

---

**Happy coding! 🚀**

For questions or issues, reach out to the development team or refer to the documentation files in the project root.
