import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, { addEdge, useEdgesState, useNodesState, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../api/client';
import StepNode from '../components/StepNode';
import StepEditorPanel from '../components/StepEditorPanel';
import GenerateWorkflowModal from '../components/GenerateWorkflowModal';
import TestConsole from '../components/TestConsole';

const nodeTypes = { step: StepNode };

function emptyWorkflow() {
  return {
    name: '',
    description: '',
    method: 'POST',
    path: '/my-endpoint',
    authRequired: false,
    requestSchema: { type: 'object', properties: {}, additionalProperties: true },
    steps: [],
    response: { mapping: {} },
  };
}

// Simple leveled layout: x = dependency depth, y = order within that depth.
function layoutSteps(steps, positionCache) {
  const depth = new Map();
  function depthOf(id, seen = new Set()) {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 0; // guard against accidental cycles while editing
    seen.add(id);
    const step = steps.find((s) => s.id === id);
    const deps = step?.dependsOn || [];
    const d = deps.length ? 1 + Math.max(...deps.map((dep) => depthOf(dep, seen))) : 0;
    depth.set(id, d);
    return d;
  }
  steps.forEach((s) => depthOf(s.id));

  // Group step ids by depth (preserving order) so a new node's y-slot is based on
  // its stable position within its depth level, not on how many siblings happened
  // to already be cached - otherwise two nodes at the same depth can collide.
  const byDepth = {};
  steps.forEach((s) => {
    const d = depth.get(s.id) || 0;
    (byDepth[d] = byDepth[d] || []).push(s.id);
  });

  const nodes = steps.map((s) => {
    const d = depth.get(s.id) || 0;
    let position = positionCache.current[s.id];
    if (!position) {
      const yIndex = byDepth[d].indexOf(s.id);
      position = { x: 80 + d * 240, y: 60 + yIndex * 130 };
      positionCache.current[s.id] = position;
    }
    return {
      id: s.id,
      type: 'step',
      position,
      data: { label: s.name || s.id, type: s.type },
    };
  });

  const edges = [];
  steps.forEach((s) => {
    (s.dependsOn || []).forEach((dep) => {
      edges.push({ id: `${dep}->${s.id}`, source: dep, target: s.id, animated: false });
    });
  });

  return { nodes, edges };
}

export default function WorkflowEditorPage({ mode }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(emptyWorkflow());
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [versions, setVersions] = useState([]);
  const positionCache = useRef({});

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const flowInstance = useRef(null);

  useEffect(() => {
    // fitView needs actual (ResizeObserver-measured) node dimensions, which aren't
    // ready on the very next animation frame - a short delay is more reliable here.
    const timer = setTimeout(() => flowInstance.current?.fitView({ padding: 0.3, maxZoom: 1 }), 60);
    return () => clearTimeout(timer);
  }, [nodes.length]);

  const rebuildGraph = useCallback((steps) => {
    const { nodes: n, edges: e } = layoutSteps(steps, positionCache);
    setNodes(n);
    setEdges(e);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (mode === 'edit' && name) {
      api.get(`/admin/workflows/${name}`).then((res) => {
        const all = res.data.data;
        setVersions(all);
        const latest = all[0];
        setWorkflow(latest);
        positionCache.current = {};
        rebuildGraph(latest.steps);
      });
    } else {
      rebuildGraph([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, name]);

  const selectedStep = useMemo(() => workflow.steps.find((s) => s.id === selectedStepId) || null, [workflow.steps, selectedStepId]);

  function updateStep(updated) {
    const steps = workflow.steps.map((s) => (s.id === updated.id ? updated : s));
    setWorkflow({ ...workflow, steps });
    setNodes((nds) => nds.map((n) => (n.id === updated.id ? { ...n, data: { label: updated.name || updated.id, type: updated.type } } : n)));
  }

  function addStep() {
    let n = 1;
    while (workflow.steps.some((s) => s.id === `step${n}`)) n += 1;
    const id = `step${n}`;
    const newStep = { id, name: '', type: 'callApi', dependsOn: [], api: { url: '', method: 'POST' } };
    const steps = [...workflow.steps, newStep];
    setWorkflow({ ...workflow, steps });
    rebuildGraph(steps);
    setSelectedStepId(id);
  }

  function deleteStep(id) {
    const steps = workflow.steps.filter((s) => s.id !== id).map((s) => ({ ...s, dependsOn: (s.dependsOn || []).filter((d) => d !== id) }));
    delete positionCache.current[id];
    setWorkflow({ ...workflow, steps });
    rebuildGraph(steps);
    setSelectedStepId(null);
  }

  const onConnect = useCallback(
    (params) => {
      // Match the "source->target" id convention used by layoutSteps() so edge
      // removal (handleEdgesChange) can reliably map an edge back to a dependsOn entry.
      setEdges((eds) => addEdge({ ...params, id: `${params.source}->${params.target}` }, eds));
      setWorkflow((wf) => ({
        ...wf,
        steps: wf.steps.map((s) =>
          s.id === params.target ? { ...s, dependsOn: [...new Set([...(s.dependsOn || []), params.source])] } : s
        ),
      }));
    },
    [setEdges]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'remove') {
          const [source, target] = change.id.split('->');
          setWorkflow((wf) => ({
            ...wf,
            steps: wf.steps.map((s) => (s.id === target ? { ...s, dependsOn: (s.dependsOn || []).filter((d) => d !== source) } : s)),
          }));
        }
      });
    },
    [onEdgesChange]
  );

  function onNodeClick(_, node) {
    setSelectedStepId(node.id);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...workflow };
      delete payload._id;
      delete payload.__v;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.version;
      delete payload.isActive;

      let saved;
      if (mode === 'create') {
        const res = await api.post('/admin/workflows', payload);
        saved = res.data.data;
      } else {
        delete payload.name;
        const res = await api.put(`/admin/workflows/${name}`, payload);
        saved = res.data.data;
      }
      navigate(`/workflows/${saved.name}`, { replace: true });
      if (mode === 'create') window.location.reload(); // simplest way to flip into "edit" mode cleanly
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Save failed');
      if (err.response?.data?.error?.details) console.error(err.response.data.error.details);
    } finally {
      setSaving(false);
    }
  }

  async function onActivateVersion(v) {
    await api.post(`/admin/workflows/${name}/activate/${v}`);
    const res = await api.get(`/admin/workflows/${name}`);
    setVersions(res.data.data);
    setWorkflow(res.data.data.find((w) => w.version === v));
  }

  return (
    <div>
      <div className="page-header">
        <h1>{mode === 'create' ? 'New Workflow' : `Edit: ${workflow.name}`}</h1>
        <div className="row" style={{ flex: 'unset', gap: 8 }}>
          <button className="btn secondary" onClick={() => setShowGenerate(true)}>
            Generate from description
          </button>
          <button className="btn" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save new version'}
          </button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <div>
            <label>Name (slug)</label>
            <input
              value={workflow.name}
              disabled={mode === 'edit'}
              onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
              placeholder="verify-pan"
            />
          </div>
          <div>
            <label>Method</label>
            <select value={workflow.method} onChange={(e) => setWorkflow({ ...workflow, method: e.target.value })}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label>Path</label>
            <input value={workflow.path} onChange={(e) => setWorkflow({ ...workflow, path: e.target.value })} placeholder="/verify-pan" />
          </div>
          <div>
            <label>Auth required (x-api-key)</label>
            <select
              value={workflow.authRequired ? 'yes' : 'no'}
              onChange={(e) => setWorkflow({ ...workflow, authRequired: e.target.value === 'yes' })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
        <label>Description</label>
        <input value={workflow.description} onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })} />

        {mode === 'edit' && versions.length > 1 && (
          <>
            <div className="section-title">Versions</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {versions.map((v) => (
                <button
                  key={v.version}
                  className="btn secondary"
                  style={{ flex: 'unset', opacity: v.isActive ? 1 : 0.6 }}
                  onClick={() => onActivateVersion(v.version)}
                >
                  v{v.version} {v.isActive ? '(active)' : ''}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="editor-layout">
        <div className="canvas-panel">
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <button className="btn secondary" onClick={addStep}>
              + Add Step
            </button>
            <span className="muted" style={{ marginLeft: 12 }}>
              Drag from a node's right handle to another node's left handle to set "depends on". Select an edge and press
              Delete/Backspace to remove it.
            </span>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onInit={(instance) => { flowInstance.current = instance; }}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <div className="side-panel">
          <StepEditorPanel step={selectedStep} onChange={updateStep} onDelete={() => selectedStep && deleteStep(selectedStep.id)} />
          <div style={{ height: 16 }} />
          <TestConsole method={workflow.method} path={mode === 'edit' ? workflow.path : ''} authRequired={workflow.authRequired} />
        </div>
      </div>

      {showGenerate && (
        <GenerateWorkflowModal
          onClose={() => setShowGenerate(false)}
          onGenerated={(generated) => {
            setWorkflow({ ...workflow, ...generated });
            positionCache.current = {};
            rebuildGraph(generated.steps);
          }}
        />
      )}
    </div>
  );
}
