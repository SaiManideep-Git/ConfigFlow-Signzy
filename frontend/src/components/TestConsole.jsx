import { useState } from 'react';
import api from '../api/client';

export default function TestConsole({ method, path, authRequired }) {
  const [body, setBody] = useState('{\n  \n}');
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setResponse(null);
    try {
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        setResponse({ error: `Invalid JSON body: ${e.message}` });
        return;
      }
      const headers = authRequired ? { 'x-api-key': apiKey } : {};
      const res = await api.request({ url: path, method, data: parsedBody, headers });
      setResponse({ status: res.status, data: res.data });
    } catch (err) {
      setResponse({ status: err.response?.status, data: err.response?.data || { error: err.message } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="section-title">Test console</div>
      <p className="muted">
        Calls <code>{method} {path || '(save the workflow first)'}</code> directly against the live backend.
      </p>
      {authRequired && (
        <>
          <label>x-api-key</label>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="cf_demo_..." />
        </>
      )}
      <label>Request body (JSON)</label>
      <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn" style={{ marginTop: 10 }} onClick={send} disabled={loading || !path}>
        {loading ? 'Sending...' : 'Send request'}
      </button>
      {response && (
        <>
          <div className="section-title">Response {response.status ? `(${response.status})` : ''}</div>
          <pre className="log-json">{JSON.stringify(response.data, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
