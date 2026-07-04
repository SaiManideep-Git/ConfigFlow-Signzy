import { useEffect, useState } from 'react';
import api from '../api/client';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/logs?limit=100')
      .then((res) => setLogs(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Execution Logs</h1>
      </div>
      {loading && <p className="muted">Loading...</p>}
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 2 }}>
          <table>
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Status</th>
                <th>Code</th>
                <th>Duration</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} onClick={() => setSelected(log)} style={{ cursor: 'pointer' }}>
                  <td>
                    {log.workflowName} <span className="muted">v{log.workflowVersion}</span>
                  </td>
                  <td>
                    <span className={`badge ${log.success ? 'success' : 'error'}`}>{log.success ? 'success' : 'failed'}</span>
                  </td>
                  <td>{log.statusCode}</td>
                  <td>{log.durationMs}ms</td>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="muted">
                    No executions yet - call one of your generated endpoints to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginTop: 0 }}>{selected.workflowName}</h3>
            <div className="section-title">Request</div>
            <pre className="log-json">{JSON.stringify(selected.requestBody, null, 2)}</pre>
            <div className="section-title">Step trace</div>
            <pre className="log-json">{JSON.stringify(selected.steps, null, 2)}</pre>
            <div className="section-title">Response</div>
            <pre className="log-json">{JSON.stringify(selected.responseBody || selected.error, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
