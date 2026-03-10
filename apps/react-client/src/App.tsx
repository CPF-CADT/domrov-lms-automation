
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicRoute from '@/components/PublicRoute';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ClassDashboard from '@/pages/ClassDashboard';
import Docs from '@/pages/Docs';
import About from '@/pages/About';
import Pricing from '@/pages/Pricing';
import AssignmentDetail from '@/pages/AssignmentDetail';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public pages - accessible to everyone */}
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/about" element={<About />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Auth pages - redirect to dashboard if already logged in */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected pages - require authentication */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/class/:id" element={<ProtectedRoute><ClassDashboard /></ProtectedRoute>} />
      <Route path="/assignment/:id" element={<ProtectedRoute><AssignmentDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
    </Routes>
  );
};

import UserProfilePage from '@/pages/profile';
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;