import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function WorkflowListPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/workflows');
      setWorkflows(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(wf) {
    if (!confirm(`Delete "${wf.name}" v${wf.version}? This cannot be undone.`)) return;
    await api.delete(`/admin/workflows/${wf.name}/${wf.version}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Workflows</h1>
        <button className="btn" onClick={() => navigate('/workflows/new')}>
          + New Workflow
        </button>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="error-text">{error}</div>}

      {!loading && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Method</th>
                <th>Path</th>
                <th>Version</th>
                <th>Status</th>
                <th>Auth</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf._id}>
                  <td>
                    <Link to={`/workflows/${wf.name}`}>{wf.name}</Link>
                  </td>
                  <td>{wf.method}</td>
                  <td>
                    <code>{wf.path}</code>
                  </td>
                  <td>v{wf.version}</td>
                  <td>
                    <span className={`badge ${wf.isActive ? 'active' : 'inactive'}`}>
                      {wf.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>{wf.authRequired ? 'API key' : 'none'}</td>
                  <td>
                    <button className="btn-link" onClick={() => onDelete(wf)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {workflows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No workflows yet. Create one, or run <code>npm run seed</code> in /backend to load the samples.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
