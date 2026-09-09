import { Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TaskBoardPage from './pages/TaskBoardPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/board" element={<TaskBoardPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['Admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
