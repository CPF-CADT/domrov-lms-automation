
import { Navigate, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicRoute from '@/components/PublicRoute';
import Landing from '@/pages/landing/LandingPage';
import Dashboard from '@/pages/dashboard/DashboardPage';
import Login from '@/pages/auth/LoginPage';
import Signup from '@/pages/auth/SignupPage';
import VerifyEmail from '@/pages/auth/VerifyEmailPage';
import OAuthCallback from '@/pages/auth/OAuthCallbackPage';
import ClassDashboard from '@/pages/classes/ClassDashboardPage';
import StudentAssignmentDetail from '@/pages/assignments/StudentAssignmentDetailPage';
import TeacherAssignmentDetail from '@/pages/assignments/TeacherAssignmentDetailPage';
import CreateClass from '@/pages/classes/CreateClassPage';
import CreateAssignmentPage from '@/pages/assignments/CreateAssignmentPage';
import EditAssignmentPage from '@/pages/assignments/EditAssignmentPage';
import TeacherGeneralTab from "@/pages/classes/tabs/TeacherGeneralTab";
import TeacherAssignmentTab from "@/pages/classes/tabs/TeacherAssignmentTab";
import StudentsTab from "@/pages/classes/tabs/StudentsTab";
import TeamsTab from "@/pages/classes/tabs/TeamsTab";
import Docs from '@/pages/docs/DocsPage';
import About from '@/pages/about/AboutPage';
import Pricing from '@/pages/pricing/PricingPage';
import CreditPurchasePage from '@/pages/billing/CreditPurchasePage';
import AIEvaluationPage from '@/pages/ai-evaluation/AIEvaluationPage';

import StudentGeneralTab from "@/pages/classes/tabs/StudentGeneralTab";
import StudentAssignmentTab from "@/pages/classes/tabs/StudentAssignmentTab";
import UserProfilePage from '@/pages/dashboard/ProfilePage';
import classService from '@/services/ClassService';
import { UserRole } from '@/types/Enums';
import { routes } from '@/lib/routes';

/**
 * Shared class routes resolve the user's role from the API instead of from
 * navigation state. This keeps direct links and browser refreshes reliable.
 */
const RoleAwareClassTab: React.FC<{ tab: 'general' | 'assignment' }> = ({ tab }) => {
  const { classId } = useParams<{ classId: string }>();
  const [role, setRole] = useState<string>();

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    classService.getMyClasses()
      .then((classes) => {
        const currentClass = classes.find((item) => item.id === Number(classId));
        if (!cancelled) setRole(currentClass?.role);
      })
      .catch(() => {
        if (!cancelled) setRole(undefined);
      });
    return () => { cancelled = true; };
  }, [classId]);

  if (!classId || !role) return null;
  const isTeacher = role === UserRole.Teacher || role === UserRole.TeacherAssistant;

  if (tab === 'general') {
    return isTeacher
      ? <TeacherGeneralTab classId={classId} />
      : <StudentGeneralTab classId={classId} />;
  }
  if (tab === 'assignment') {
    return isTeacher
      ? <TeacherAssignmentTab classId={classId} />
      : <StudentAssignmentTab classId={classId} />;
  }
  return isTeacher
    ? <TeacherAssignmentTab classId={classId} />
    : <StudentAssignmentTab classId={classId} />;
};

const TeacherOnlyClassTab: React.FC<{ tab: 'students' | 'teams' }> = ({ tab }) => {
  const { classId } = useParams<{ classId: string }>();
  const [isTeacher, setIsTeacher] = useState<boolean>();

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    classService.getMyClasses().then((classes) => {
      const role = classes.find((item) => item.id === Number(classId))?.role;
      if (!cancelled) setIsTeacher(role === UserRole.Teacher || role === UserRole.TeacherAssistant);
    }).catch(() => {
      if (!cancelled) setIsTeacher(false);
    });
    return () => { cancelled = true; };
  }, [classId]);

  if (isTeacher === undefined) return null;
  if (!isTeacher || !classId) return <Navigate to={classId ? routes.classAssignments(classId) : routes.classes} replace />;
  return tab === 'students' ? <StudentsTab classId={classId} /> : <TeamsTab classId={classId} />;
};

const CanonicalCreateAssignment: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  return classId ? <CreateAssignmentPage classId={classId} /> : null;
};

const CanonicalAssignmentDetail: React.FC = () => {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>();
  const [role, setRole] = useState<string>();
  useEffect(() => {
    if (!classId) return;
    classService.getMyClasses().then((classes) => {
      setRole(classes.find((item) => item.id === Number(classId))?.role);
    }).catch(() => setRole(undefined));
  }, [classId]);
  if (!classId || !assignmentId || !role) return null;
  return role === UserRole.Teacher || role === UserRole.TeacherAssistant
    ? <TeacherAssignmentDetail />
    : <StudentAssignmentDetail />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public pages - accessible to everyone */}
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/about" element={<About />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/login/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* Protected pages - require authentication */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/classes/new" element={<ProtectedRoute><CreateClass /></ProtectedRoute>} />

      {/* Canonical URL-driven class resources */}
      <Route path="/classes/:classId" element={<ProtectedRoute><ClassDashboard /></ProtectedRoute>}>
        <Route index element={<Navigate to="general" replace />} />
        <Route path="general" element={<RoleAwareClassTab tab="general" />} />
        <Route path="assignments" element={<RoleAwareClassTab tab="assignment" />} />
        <Route path="students" element={<TeacherOnlyClassTab tab="students" />} />
        <Route path="teams" element={<TeacherOnlyClassTab tab="teams" />} />
        <Route path="grades" element={<Navigate to="../assignments" replace />} />
      </Route>
      <Route path="/classes/:classId/assignments/new" element={<ProtectedRoute><CanonicalCreateAssignment /></ProtectedRoute>} />
      <Route path="/classes/:classId/assignments/:assignmentId" element={<ProtectedRoute><CanonicalAssignmentDetail /></ProtectedRoute>} />
      <Route path="/classes/:classId/assignments/:assignmentId/edit" element={<ProtectedRoute><EditAssignmentPage mode="edit" /></ProtectedRoute>} />
      <Route path="/classes/:classId/assignments/:assignmentId/grade" element={<ProtectedRoute><EditAssignmentPage mode="grade" /></ProtectedRoute>} />

      <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
      <Route path="/creditPurchase" element={<ProtectedRoute><CreditPurchasePage /></ProtectedRoute>} />
      <Route path="/ai-evaluation" element={<ProtectedRoute><AIEvaluationPage /></ProtectedRoute>} />

    </Routes>
  );
};

// Wrapper component to handle initial redirect for authenticated users
// Uses in-memory (RAM) tracking that resets on page refresh
const InitialAuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    // Only check once when auth loading completes
    if (!isLoading && !initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;

      // If authenticated and on landing page, navigate to dashboard
      if (isAuthenticated && location.pathname === '/') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <InitialAuthRedirect>
        <AppRoutes />
      </InitialAuthRedirect>
    </AuthProvider>
  );
};

export default App;
