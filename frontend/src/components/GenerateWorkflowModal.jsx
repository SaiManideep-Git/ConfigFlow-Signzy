import { useState } from 'react';
import api from '../api/client';

export default function GenerateWorkflowModal({ onClose, onGenerated }) {
  const [description, setDescription] = useState(
    'Create an API that validates a PAN using Vendor A and, if successful, fetches GST details from Vendor B.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/agent/generate-workflow', { description });
      onGenerated(res.data.data.workflowConfig);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Generate workflow from description</h3>
        <p className="muted">
          The Agentic AI feature converts a plain-English description into a draft workflow config using Claude. Review and
          adjust it before saving.
        </p>
        <label>Description</label>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <div className="error-text">{error}</div>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={onGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
