import { useEffect, useState } from 'react';
import api from '../api/client';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    api
      .get('/admin/api-keys')
      .then((res) => {
        setKeys(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>API Keys</h1>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading API keys...</p>
        ) : keys.length === 0 ? (
          <p className="muted">No API keys found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>LABEL</th>
                <th>API KEY</th>
                <th>STATUS</th>
                <th>CREATED AT</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k._id}>
                  <td>{k.label}</td>
                  <td>
                    <code style={{ fontSize: '1.1em', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                      {k.key}
                    </code>
                  </td>
                  <td>
                    <span className={`status-badge ${k.isActive ? 'active' : 'inactive'}`}>
                      {k.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="muted">{new Date(k.createdAt).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn secondary"
                      style={{ padding: '4px 12px', fontSize: '0.9em', width: 'auto' }}
                      onClick={() => handleCopy(k._id, k.key)}
                    >
                      {copiedId === k._id ? 'Copied!' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
