import { useAuth } from '../context/AuthContext';

// Placeholder landing page after login. Will be replaced by the real
// Dashboard page once Project + Task Kanban are built (see agreed page
// order: Login -> Project -> Task Kanban -> Dashboard).
export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="page">
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.role}</p>
      <p>Email: {user.email}</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
