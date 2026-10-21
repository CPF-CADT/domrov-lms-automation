
import { Navigate, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AssignmentProvider } from '@/context/AssignmentContext';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicRoute from '@/components/PublicRoute';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import VerifyEmail from '@/pages/VerifyEmail';
import OAuthCallback from '@/pages/auth/OAuthCallback';
import ClassDashboard from '@/pages/ClassDashboard';
import StudentAssignmentDetail from '@/pages/StudentAssignmentDetail';
import TeacherAssignmentDetail from '@/pages/TeacherAssignmentDetail';
import CreateClass from '@/pages/CreateClass';
import CreateAssignmentPage from '@/pages/CreateAssignmentForm';
import EditAssignmentPage from '@/pages/EditAssignmentPage';
import TeacherGeneralTab from "@/features/class-dashboard/tabs/TeacherGeneralTab";
import TeacherAssignmentTab from "@/features/class-dashboard/tabs/TeacherAssignmentTab";
import StudentsTab from "@/features/class-dashboard/tabs/StudentsTab";
import TeamsTab from "@/features/class-dashboard/tabs/TeamsTab";
import TeacherGradesTab from "@/features/class-dashboard/tabs/TeacherGradesTab";
import Docs from '@/pages/Docs';
import About from '@/pages/About';
import Pricing from '@/pages/Pricing';
import AssignmentDetail from '@/pages/AssignmentDetail';
import CreditPurchasePage from './pages/CreditPurchasePage';
import AIEvaluationPage from '@/pages/AIEvaluationPage';

import StudentGeneralTab from "@/features/class-dashboard/tabs/StudentGeneralTab";
import StudentAssignmentTab from "@/features/class-dashboard/tabs/StudentAssignmentTab";
import StudentGradesTab from "@/features/class-dashboard/tabs/StudentGradesTab";
import UserProfilePage from '@/pages/Profile';
import classService from '@/services/ClassService';
import { UserRole } from '@/types/Enums';
import { routes } from '@/lib/routes';

const LegacyClassRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? routes.classGeneral(id) : routes.classes} replace />;
};

const LegacyClassTabRedirect: React.FC<{ tab: 'general' | 'assignment' | 'students' | 'teams' | 'grades' }> = ({ tab }) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to={routes.classes} replace />;
  const target = tab === 'general' ? routes.classGeneral(id)
    : tab === 'assignment' ? routes.classAssignments(id)
      : tab === 'students' ? routes.classStudents(id)
        : tab === 'teams' ? routes.classTeams(id)
          : routes.classGrades(id);
  return <Navigate to={target} replace />;
};

const LegacyStudentAssignmentRedirect: React.FC = () => {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>();
  return <Navigate to={classId && assignmentId ? routes.assignment(classId, assignmentId) : routes.classes} replace />;
};

const LegacyAssignmentRedirect: React.FC<{ mode: 'new' | 'edit' | 'grade' }> = ({ mode }) => {
  const { id, assignmentId } = useParams<{ id: string; assignmentId?: string }>();
  if (!id) return <Navigate to={routes.classes} replace />;
  if (mode === 'new') return <Navigate to={routes.assignmentCreate(id)} replace />;
  if (!assignmentId) return <Navigate to={routes.classAssignments(id)} replace />;
  return <Navigate to={mode === 'edit' ? routes.assignmentEdit(id, assignmentId) : routes.assignmentGrade(id, assignmentId)} replace />;
};

/**
 * Shared class routes resolve the user's role from the API instead of from
 * navigation state. This keeps direct links and browser refreshes reliable.
 */
const RoleAwareClassTab: React.FC<{ tab: 'general' | 'assignment' | 'grades' }> = ({ tab }) => {
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
    ? <TeacherGradesTab classId={classId} />
    : <StudentGradesTab classId={classId} />;
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
      <Route path="/class/create" element={<Navigate to="/classes/new" replace />} />

      {/* Canonical URL-driven class resources */}
      <Route path="/classes/:classId" element={<ProtectedRoute><ClassDashboard /></ProtectedRoute>}>
        <Route index element={<Navigate to="general" replace />} />
        <Route path="general" element={<RoleAwareClassTab tab="general" />} />
        <Route path="assignments" element={<RoleAwareClassTab tab="assignment" />} />
        <Route path="students" element={<TeacherOnlyClassTab tab="students" />} />
        <Route path="teams" element={<TeacherOnlyClassTab tab="teams" />} />
        <Route path="grades" element={<RoleAwareClassTab tab="grades" />} />
      </Route>
      <Route path="/classes/:classId/assignments/new" element={<ProtectedRoute><CanonicalCreateAssignment /></ProtectedRoute>} />
      <Route path="/classes/:classId/assignments/:assignmentId" element={<ProtectedRoute><CanonicalAssignmentDetail /></ProtectedRoute>} />
      <Route path="/classes/:classId/assignments/:assignmentId/edit" element={<ProtectedRoute><EditAssignmentPage mode="edit" /></ProtectedRoute>} />
      <Route path="/classes/:classId/assignments/:assignmentId/grade" element={<ProtectedRoute><EditAssignmentPage mode="grade" /></ProtectedRoute>} />

      {/* Legacy links; keep them working while clients migrate to /classes. */}
      <Route path="/class/:id" element={<LegacyClassRedirect />} />
      <Route path="/student-class/:id" element={<LegacyClassRedirect />} />
      <Route path="/class/:id/general" element={<LegacyClassTabRedirect tab="general" />} />
      <Route path="/class/:id/assignment" element={<LegacyClassTabRedirect tab="assignment" />} />
      <Route path="/class/:id/students" element={<LegacyClassTabRedirect tab="students" />} />
      <Route path="/class/:id/teams" element={<LegacyClassTabRedirect tab="teams" />} />
      <Route path="/class/:id/grades" element={<LegacyClassTabRedirect tab="grades" />} />
      <Route path="/student-class/:id/general" element={<LegacyClassTabRedirect tab="general" />} />
      <Route path="/student-class/:id/assignment" element={<LegacyClassTabRedirect tab="assignment" />} />
      <Route path="/student-class/:id/grades" element={<LegacyClassTabRedirect tab="grades" />} />
      <Route path="/student-class/:classId/assignment/:assignmentId" element={<LegacyStudentAssignmentRedirect />} />
      <Route path="/class/:id/assignment/create" element={<LegacyAssignmentRedirect mode="new" />} />
      <Route path="/class/:id/assignment/:assignmentId/create" element={<LegacyAssignmentRedirect mode="edit" />} />
      <Route path="/class/:id/assignment/:assignmentId/edit" element={<LegacyAssignmentRedirect mode="edit" />} />
      <Route path="/class/:id/assignment/:assignmentId/grade" element={<LegacyAssignmentRedirect mode="grade" />} />
      <Route path="/class/:id/assignment/:assignmentId/view" element={<LegacyAssignmentRedirect mode="edit" />} />
      <Route path="/assignment/:id" element={<ProtectedRoute><AssignmentDetail /></ProtectedRoute>} />
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
      <AssignmentProvider>
        <InitialAuthRedirect>
          <AppRoutes />
        </InitialAuthRedirect>
      </AssignmentProvider>
    </AuthProvider>
  );
};

export default App;
