import { Handle, Position } from 'reactflow';

export default function StepNode({ data }) {
  return (
    <div className={`step-node ${data.type}`}>
      <Handle type="target" position={Position.Left} />
      <div className="step-type">{data.type === 'callApi' ? 'Call API' : 'Transform'}</div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
