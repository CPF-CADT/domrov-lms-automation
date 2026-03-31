
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
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
import CreateClass from '@/pages/CreateClass';
import CreateAssignmentPage from '@/pages/CreateAssignmentPage';
import EditAssignmentPage from '@/pages/EditAssignmentPage';
import TeacherGeneralTab from "@/features/classDashboard/tabs/TeacherGeneralTab";
import TeacherAssignmentTab from "@/features/classDashboard/tabs/TeacherAssignmentTab";
import StudentsTab from "@/features/classDashboard/tabs/StudentsTab";
import TeamsTab from "@/features/classDashboard/tabs/TeamsTab";
import TeacherGradesTab from "@/features/classDashboard/tabs/TeacherGradesTab";
import Docs from '@/pages/Docs';
import About from '@/pages/About';
import Pricing from '@/pages/Pricing';
import AssignmentDetail from '@/pages/AssignmentDetail';
import CreditPurchasePage from './pages/CreditPurchase';
import AIEvaluationPage from '@/pages/AIEvaluationPage';

import StudentGeneralTab from "@/features/classDashboard/tabs/StudentGeneralTab";
import StudentAssignmentTab from "@/features/classDashboard/tabs/StudentAssignmentTab";
import StudentGradesTab from "@/features/classDashboard/tabs/StudentGradesTab";
import UserProfilePage from '@/pages/profile';
import { useParams } from 'react-router-dom';

const CreateAssignmentPageWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CreateAssignmentPage classId={id} />;
};

const TeacherGeneralTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <TeacherGeneralTab classId={id} />;
};

const TeacherAssignmentTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <TeacherAssignmentTab classId={id} />;
};

const StudentsTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <StudentsTab classId={id} />;
};

const TeamsTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <TeamsTab classId={id} />;
};

const TeacherGradesTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <TeacherGradesTab classId={id} />;
};

const StudentGeneralTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <StudentGeneralTab classId={id} />;
};

const StudentAssignmentTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <StudentAssignmentTab classId={id} />;
};

const StudentGradesTabWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <StudentGradesTab classId={id} />;
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
      <Route path="/class/create" element={<ProtectedRoute><CreateClass /></ProtectedRoute>} />
      <Route path="/class/:id" element={<ProtectedRoute><ClassDashboard /></ProtectedRoute>}>
        <Route index element={<TeacherGeneralTabWrapper />} />
        <Route path="general" element={<TeacherGeneralTabWrapper />} />
        <Route path="assignment" element={<TeacherAssignmentTabWrapper />} />
        <Route path="students" element={<StudentsTabWrapper />} />
        <Route path="teams" element={<TeamsTabWrapper />} />
        <Route path="grades" element={<TeacherGradesTabWrapper />} />
      </Route>
      <Route path="/student-class/:id" element={<ProtectedRoute><ClassDashboard /></ProtectedRoute>}>
        <Route index element={<StudentGeneralTabWrapper />} />
        <Route path="general" element={<StudentGeneralTabWrapper />} />
        <Route path="assignment" element={<StudentAssignmentTabWrapper />} />
        <Route path="grades" element={<StudentGradesTabWrapper />} />
      </Route>
      <Route path="/student-class/:classId/assignment/:assignmentId" element={<ProtectedRoute><StudentAssignmentDetail /></ProtectedRoute>} />
      <Route
        path="/class/:id/assignment/create"
        element={
          <ProtectedRoute>
            <CreateAssignmentPageWrapper />
          </ProtectedRoute>
        }
      />
      <Route path="/class/:id/assignment/:assignmentId/create" element={<ProtectedRoute><EditAssignmentPage /></ProtectedRoute>} />
      <Route path="/class/:id/assignment/:assignmentId/edit" element={<ProtectedRoute><EditAssignmentPage /></ProtectedRoute>} />
      <Route path="/class/:id/assignment/:assignmentId/grade" element={<ProtectedRoute><EditAssignmentPage /></ProtectedRoute>} />
      <Route path="/class/:id/assignment/:assignmentId/view" element={<ProtectedRoute><EditAssignmentPage /></ProtectedRoute>} />
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