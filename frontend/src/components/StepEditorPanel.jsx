import { useState, useEffect } from 'react';

function JsonField({ label, value, onChange, placeholder }) {
  const [text, setText] = useState(JSON.stringify(value ?? {}, null, 2));
  const [err, setErr] = useState(null);

  useEffect(() => {
    setText(JSON.stringify(value ?? {}, null, 2));
  }, [value]);

  return (
    <>
      <label>{label}</label>
      <textarea
        rows={4}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            const parsed = text.trim() ? JSON.parse(text) : {};
            setErr(null);
            onChange(parsed);
          } catch (e2) {
            setErr('Invalid JSON: ' + e2.message);
          }
        }}
      />
      {err && <div className="error-text">{err}</div>}
    </>
  );
}

export default function StepEditorPanel({ step, onChange, onDelete }) {
  if (!step) {
    return (
      <div className="card">
        <p className="muted">Select a step on the canvas to edit it, or click "+ Add Step" to create one.</p>
      </div>
    );
  }

  const set = (patch) => onChange({ ...step, ...patch });
  const setApi = (patch) => onChange({ ...step, api: { ...step.api, ...patch } });
  const setAuth = (patch) => onChange({ ...step, api: { ...step.api, auth: { ...step.api?.auth, ...patch } } });
  const setRetry = (patch) => onChange({ ...step, api: { ...step.api, retry: { ...step.api?.retry, ...patch } } });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{step.id}</strong>
        <button className="btn-link" onClick={onDelete}>
          Delete step
        </button>
      </div>

      <label>Name</label>
      <input value={step.name || ''} onChange={(e) => set({ name: e.target.value })} placeholder="Human readable name" />

      <label>Type</label>
      <select value={step.type} onChange={(e) => set({ type: e.target.value, api: undefined, transform: undefined })}>
        <option value="callApi">callApi</option>
        <option value="transform">transform</option>
      </select>

      <label>Depends on</label>
      <div className="muted">
        {step.dependsOn?.length ? step.dependsOn.join(', ') : 'none'} - wire this by dragging a connection on the canvas.
      </div>

      <label>Run only if (jsonata boolean expression, optional)</label>
      <input
        value={step.runIf || ''}
        onChange={(e) => set({ runIf: e.target.value || undefined })}
        placeholder="e.g. steps.vendorA.output.status = 'SUCCESS'"
      />

      <label>On error</label>
      <select value={step.onError || 'abort'} onChange={(e) => set({ onError: e.target.value })}>
        <option value="abort">abort - fail the whole request</option>
        <option value="skip">skip - mark step skipped, continue</option>
        <option value="continue">continue - treat as null output, continue</option>
      </select>

      {step.type === 'callApi' && (
        <>
          <div className="section-title">API call</div>
          <div className="row">
            <div>
              <label>Method</label>
              <select value={step.api?.method || 'POST'} onChange={(e) => setApi({ method: e.target.value })}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 3 }}>
              <label>URL (supports {'{{input.field}}'} templates)</label>
              <input value={step.api?.url || ''} onChange={(e) => setApi({ url: e.target.value })} />
            </div>
          </div>

          <JsonField label="Headers (JSON)" value={step.api?.headers} onChange={(headers) => setApi({ headers })} />
          <JsonField
            label='Body mapping (JSON, values starting with "$." read from context, e.g. "$.input.pan")'
            value={step.api?.bodyMapping}
            onChange={(bodyMapping) => setApi({ bodyMapping })}
          />

          <label>Auth type</label>
          <select value={step.api?.auth?.type || 'none'} onChange={(e) => setAuth({ type: e.target.value })}>
            <option value="none">none</option>
            <option value="apiKey">apiKey</option>
            <option value="bearer">bearer</option>
            <option value="basic">basic</option>
          </select>
          {step.api?.auth?.type === 'apiKey' && (
            <>
              <label>Header name</label>
              <input value={step.api?.auth?.headerName || 'x-api-key'} onChange={(e) => setAuth({ headerName: e.target.value })} />
              <label>Token</label>
              <input value={step.api?.auth?.token || ''} onChange={(e) => setAuth({ token: e.target.value })} />
            </>
          )}
          {step.api?.auth?.type === 'bearer' && (
            <>
              <label>Token</label>
              <input value={step.api?.auth?.token || ''} onChange={(e) => setAuth({ token: e.target.value })} />
            </>
          )}
          {step.api?.auth?.type === 'basic' && (
            <div className="row">
              <div>
                <label>Username</label>
                <input value={step.api?.auth?.username || ''} onChange={(e) => setAuth({ username: e.target.value })} />
              </div>
              <div>
                <label>Password</label>
                <input value={step.api?.auth?.password || ''} onChange={(e) => setAuth({ password: e.target.value })} />
              </div>
            </div>
          )}

          <div className="section-title">Retry policy</div>
          <div className="row">
            <div>
              <label>Attempts</label>
              <input
                type="number"
                min="0"
                value={step.api?.retry?.attempts ?? 0}
                onChange={(e) => setRetry({ attempts: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Backoff (ms)</label>
              <input
                type="number"
                min="0"
                value={step.api?.retry?.backoffMs ?? 300}
                onChange={(e) => setRetry({ backoffMs: Number(e.target.value) })}
              />
            </div>
          </div>
          <label>Retry on HTTP status (comma separated)</label>
          <input
            value={(step.api?.retry?.retryOnStatus || [502, 503, 504]).join(',')}
            onChange={(e) =>
              setRetry({
                retryOnStatus: e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => !Number.isNaN(n)),
              })
            }
          />

          <label>Timeout (ms)</label>
          <input type="number" value={step.api?.timeoutMs ?? 5000} onChange={(e) => setApi({ timeoutMs: Number(e.target.value) })} />
        </>
      )}

      {step.type === 'transform' && (
        <>
          <div className="section-title">Transform</div>
          <label>Jsonata expression (evaluated against {'{ input, steps, params }'})</label>
          <textarea
            rows={6}
            value={step.transform?.expression || ''}
            onChange={(e) => onChange({ ...step, transform: { expression: e.target.value } })}
            placeholder='{ "verified": steps.vendorA.output.status = &apos;SUCCESS&apos; }'
          />
        </>
      )}
    </div>
  );
}
