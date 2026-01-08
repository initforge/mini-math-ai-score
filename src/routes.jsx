import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiKeyProvider } from './contexts/ApiKeyContext';
import PageTransition from './components/common/PageTransition';
import Sidebar from './components/common/Sidebar';

// Component để render Sidebar chỉ khi authenticated VÀ không phải landing/login pages
function ConditionalSidebar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Không hiển thị sidebar ở landing page và login pages
  const publicPaths = ['/', '/login/teacher', '/login/student', '/admin'];
  const isPublicPage = publicPaths.includes(location.pathname);
  
  return isAuthenticated && !isPublicPage ? <Sidebar /> : null;
}

// Component để redirect sau khi auto login
function AutoRedirect() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Nếu đã đăng nhập và đang ở landing page hoặc login page
    if (isAuthenticated && user) {
      const publicPaths = ['/', '/login/teacher', '/login/student', '/admin'];
      if (publicPaths.includes(location.pathname)) {
        // Redirect đến dashboard tương ứng với role
        if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.role === 'teacher') {
          navigate('/teacher/dashboard', { replace: true });
        } else if (user.role === 'student') {
          navigate('/student/home', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, location.pathname, navigate]);
  
  return null;
}

// Landing & Auth
import LandingPage from './components/landing/LandingPage';
import TeacherLogin from './components/auth/TeacherLogin';
import StudentLogin from './components/auth/StudentLogin';
import AdminLogin from './components/auth/AdminLogin';

// Admin
import AdminDashboard from './components/admin/Dashboard/Dashboard';
import UserManagement from './components/admin/UserManagement/UserManagement';
import Logs from './components/admin/Logs/Logs';

// Teacher
import TeacherDashboard from './components/teacher/Dashboard/Dashboard';
import ClassManagement from './components/teacher/ClassManagement/ClassManagement';
import ExamBank from './components/teacher/ExamBank/ExamBank';
import ExamCreation from './components/teacher/ExamCreation/ExamCreation';
import ExamOrganization from './components/teacher/ExamOrganization/ExamOrganization';
import Results from './components/teacher/Results/Results';
import StudentExamDetail from './components/teacher/Results/StudentExamDetail';

// Student
import StudentHome from './components/student/Home/Home';
import ExamRoom from './components/student/ExamRoom/ExamRoom';
import History from './components/student/History/History';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, hasRole } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// Wrapper component for page transitions
function PageWrapper({ children }) {
  return <PageTransition>{children}</PageTransition>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
      <Route path="/login/teacher" element={<PageWrapper><TeacherLogin /></PageWrapper>} />
      <Route path="/login/student" element={<PageWrapper><StudentLogin /></PageWrapper>} />
      <Route path="/admin" element={<PageWrapper><AdminLogin /></PageWrapper>} />
      
      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <PageWrapper><AdminDashboard /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <PageWrapper><UserManagement /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute requiredRole="admin">
            <PageWrapper><Logs /></PageWrapper>
          </ProtectedRoute>
        }
      />
      
      {/* Teacher Routes */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><TeacherDashboard /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><ClassManagement /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><ExamBank /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/create"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><ExamCreation /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/exams/organize"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><ExamOrganization /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/results"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><Results /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/results/:examId/:studentId"
        element={
          <ProtectedRoute requiredRole="teacher">
            <PageWrapper><StudentExamDetail /></PageWrapper>
          </ProtectedRoute>
        }
      />
      
      {/* Student Routes */}
      <Route
        path="/student/home"
        element={
          <ProtectedRoute requiredRole="student">
            <PageWrapper><StudentHome /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exam/:examId"
        element={
          <ProtectedRoute requiredRole="student">
            <PageWrapper><ExamRoom /></PageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/history"
        element={
          <ProtectedRoute requiredRole="student">
            <PageWrapper><History /></PageWrapper>
          </ProtectedRoute>
        }
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppWithAuth() {
  return (
    <>
      <ConditionalSidebar />
      <AutoRedirect />
      <AppRoutes />
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ApiKeyProvider>
          <AppWithAuth />
        </ApiKeyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

