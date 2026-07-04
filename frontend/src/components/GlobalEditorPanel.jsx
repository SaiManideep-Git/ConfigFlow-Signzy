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
        rows={6}
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

export default function GlobalEditorPanel({ workflow, onChange }) {
  const [responseType, setResponseType] = useState('none');

  useEffect(() => {
    if (workflow.response && 'expression' in workflow.response) {
      setResponseType('expression');
    } else if (workflow.response && 'mapping' in workflow.response) {
      setResponseType('mapping');
    } else {
      setResponseType('none');
    }
  }, [workflow.response]);

  const setWorkflow = (patch) => onChange({ ...workflow, ...patch });

  const handleResponseTypeChange = (type) => {
    setResponseType(type);
    if (type === 'none') {
      setWorkflow({ response: undefined });
    } else if (type === 'mapping') {
      setWorkflow({ response: { mapping: workflow.response?.mapping || {} } });
    } else if (type === 'expression') {
      setWorkflow({ response: { expression: workflow.response?.expression || '' } });
    }
  };

  const handleRequestSchemaChange = (schema) => {
    setWorkflow({ requestSchema: Object.keys(schema).length > 0 ? schema : undefined });
  };

  const handleResponseMappingChange = (mapping) => {
    setWorkflow({ response: { mapping } });
  };

  const handleResponseExpressionChange = (expr) => {
    setWorkflow({ response: { expression: expr } });
  };

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0, marginBottom: 12 }}>
        Global Workflow Settings
      </div>

      <JsonField
        label="Request Validation Schema (JSON Schema)"
        value={workflow.requestSchema}
        onChange={handleRequestSchemaChange}
        placeholder={JSON.stringify(
          {
            type: 'object',
            required: ['pan'],
            properties: {
              pan: { type: 'string' },
            },
          },
          null,
          2
        )}
      />

      <div className="section-title" style={{ marginTop: 16, marginBottom: 8 }}>
        Response Formatting
      </div>

      <label>Response Format Type</label>
      <select value={responseType} onChange={(e) => handleResponseTypeChange(e.target.value)}>
        <option value="none">default - return raw step outputs</option>
        <option value="mapping">mapping - flat dot-path matching</option>
        <option value="expression">expression - JSONata query</option>
      </select>

      {responseType === 'mapping' && (
        <JsonField
          label="Response Mapping (JSON)"
          value={workflow.response?.mapping}
          onChange={handleResponseMappingChange}
          placeholder={JSON.stringify(
            {
              result: '$.steps.step3.output',
            },
            null,
            2
          )}
        />
      )}

      {responseType === 'expression' && (
        <>
          <label>Response JSONata Expression</label>
          <textarea
            rows={6}
            value={workflow.response?.expression || ''}
            onChange={(e) => handleResponseExpressionChange(e.target.value)}
            placeholder='{ "verified": steps.step1.output.status = &apos;SUCCESS&apos; }'
          />
        </>
      )}
    </div>
  );
}
