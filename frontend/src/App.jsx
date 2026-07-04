import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import WorkflowListPage from './pages/WorkflowListPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import LogsPage from './pages/LogsPage';
import ApiKeysPage from './pages/ApiKeysPage';

function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          ConfigFlow
        </Link>
        <nav>
          <Link to="/">Workflows</Link>
          <Link to="/logs">Execution Logs</Link>
          <Link to="/api-keys">API Keys</Link>
        </nav>
        <div className="topbar-right">
          <span className="user-email">{email}</span>
          <button
            className="btn-link"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Shell>
              <WorkflowListPage />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/workflows/new"
        element={
          <RequireAuth>
            <Shell>
              <WorkflowEditorPage mode="create" />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/workflows/:name"
        element={
          <RequireAuth>
            <Shell>
              <WorkflowEditorPage mode="edit" />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/logs"
        element={
          <RequireAuth>
            <Shell>
              <LogsPage />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/api-keys"
        element={
          <RequireAuth>
            <Shell>
              <ApiKeysPage />
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
