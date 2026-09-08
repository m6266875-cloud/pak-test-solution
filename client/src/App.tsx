import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setCredentials, logout } from './store/slices/authSlice';
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
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 gradient-brand rounded-2xl flex items-center justify-center shadow-brand animate-pulse-soft">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-sm text-surface-500 font-medium">Loading Pak Test...</p>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);

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
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
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
        <Route path="admin/analytics" element={<RequireAdmin><AdminAuditPage /></RequireAdmin>} />
        <Route path="admin/audit" element={<RequireAdmin><AdminAuditPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
