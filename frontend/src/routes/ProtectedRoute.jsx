import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap any page that needs a logged-in user, e.g.:
//   <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
// `roles` is optional — pass e.g. roles={['Admin']} to also gate by role
// once an Admin-only page (e.g. user management) is built.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
