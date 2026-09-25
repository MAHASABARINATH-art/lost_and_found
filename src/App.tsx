import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute, AdminRoute, PublicOnlyRoute } from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { LoadingPage } from '@/components/ui';

import SplashPage from '@/pages/SplashPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import UserDashboard from '@/pages/user/UserDashboard';
import ReportLostPage from '@/pages/user/ReportLostPage';
import ReportFoundPage from '@/pages/user/ReportFoundPage';
import SearchPage from '@/pages/user/SearchPage';
import ItemDetailsPage from '@/pages/user/ItemDetailsPage';
import MyReportsPage from '@/pages/user/MyReportsPage';
import MyClaimsPage from '@/pages/user/MyClaimsPage';
import ClaimDetailsPage from '@/pages/user/ClaimDetailsPage';
import ClaimItemPage from '@/pages/user/ClaimItemPage';
import NotificationsPage from '@/pages/user/NotificationsPage';
import ProfilePage from '@/pages/user/ProfilePage';
import MatchesPage from '@/pages/user/MatchesPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminLostReports from '@/pages/admin/AdminLostReports';
import AdminFoundReports from '@/pages/admin/AdminFoundReports';
import AdminClaims from '@/pages/admin/AdminClaims';
import AdminArchivedReports from '@/pages/admin/AdminArchivedReports';

function RootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/splash" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/splash" element={<PublicOnlyRoute><SplashPage /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          {/* User routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/report-lost" element={<ReportLostPage />} />
            <Route path="/report-found" element={<ReportFoundPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/item/:type/:id" element={<ItemDetailsPage />} />
            <Route path="/my-reports" element={<MyReportsPage />} />
            <Route path="/my-claims" element={<MyClaimsPage />} />
            <Route path="/my-claims/:id" element={<ClaimDetailsPage />} />
            <Route path="/claim/:foundItemId" element={<ClaimItemPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/matches" element={<MatchesPage />} />
          </Route>

          {/* Admin routes */}
          <Route
            element={
              <AdminRoute>
                <AppLayout />
              </AdminRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/lost-reports" element={<AdminLostReports />} />
            <Route path="/admin/found-reports" element={<AdminFoundReports />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
            <Route path="/admin/archived-reports" element={<AdminArchivedReports />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
