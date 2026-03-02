
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './constants/config';
import { AuthProvider } from './context/authContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import CreditPackages from './pages/CreditPackages';
import Transactions from './pages/Transactions';
import Evaluations from './pages/Evaluations';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.USERS}
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:userId"
        element={
          <ProtectedRoute>
            <UserDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PACKAGES}
        element={
          <ProtectedRoute>
            <CreditPackages />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.TRANSACTIONS}
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.EVALUATIONS}
        element={
          <ProtectedRoute>
            <Evaluations />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;