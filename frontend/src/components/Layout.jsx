import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shared shell for every page behind ProtectedRoute: top nav + whichever
// page matched the current route (rendered via <Outlet/>).
export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-links">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          {user.role === 'Admin' && <NavLink to="/admin/users">Admin</NavLink>}
        </div>
        <div className="navbar-user">
          <NavLink to="/profile">
            {user.name} ({user.role})
          </NavLink>
          <button onClick={logout}>Log out</button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
