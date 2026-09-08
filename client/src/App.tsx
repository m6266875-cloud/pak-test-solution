import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setCredentials, logout, setLoading } from './store/slices/authSlice';
import { authApi } from './api/auth';

// Layouts
import DashboardLayout from './components/common/DashboardLayout';

// Pages
import LandingPage from './pages/Marketing/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import GeneratePaperPage from './pages/Papers/GeneratePaperPage';
import MyPapersPage from './pages/Papers/MyPapersPage';
import PaperDetailPage from './pages/Papers/PaperDetailPage';
import QuestionBankPage from './pages/Questions/QuestionBankPage';
import AdminUsersPage from './pages/Admin/AdminUsersPage';
import AdminAuditPage from './pages/Admin/AdminAuditPage';
import ProfilePage from './pages/Profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  if (isLoading) return <FullPageSpinner />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAppSelector((s) => s.auth);
  if (!user || !['super_admin', 'school_admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);

  // Auto-login: try refreshing token on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await authApi.refresh();
        const accessToken = data.data.accessToken;
        const profileRes = await authApi.getProfile();
        dispatch(setCredentials({ user: profileRes.data.data, accessToken }));
      } catch {
        dispatch(logout());
      }
    };
    init();
  }, [dispatch]);

  if (isLoading) return <FullPageSpinner />;

  return (
    <Routes>
      {/* Public marketing site */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected app */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="papers/generate" element={<GeneratePaperPage />} />
        <Route path="papers" element={<MyPapersPage />} />
        <Route path="papers/:id" element={<PaperDetailPage />} />
        <Route path="questions" element={<QuestionBankPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* Admin only */}
        <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="admin/audit" element={<RequireAdmin><AdminAuditPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
