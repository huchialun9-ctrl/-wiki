import { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

interface CanvasEditorProps {
  initialData: string | null;
  onChange: (data: string) => void;
  onPlayNode: (timestamp: number) => void;
  currentTime: number;
}

function CanvasFlow({ initialData, onChange, onPlayNode, currentTime }: CanvasEditorProps) {
  const { setCenter } = useReactFlow();
  
  // Parse initial data
  const parsedData = initialData ? JSON.parse(initialData) : { nodes: [], edges: [] };
  
  // Inject onPlay callback into nodes
  const nodesWithCallbacks = parsedData.nodes.map((node: any) => ({
    ...node,
    data: { ...node.data, onPlay: onPlayNode }
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsedData.edges || []);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  // Sync back to parent when nodes/edges change
  useEffect(() => {
    // debounce this in a real app
    const timeout = setTimeout(() => {
      // Remove the onPlay callback before saving
      const cleanNodes = nodes.map(n => {
        const { onPlay, ...restData } = n.data;
        return { ...n, data: restData };
      });
      onChange(JSON.stringify({ nodes: cleanNodes, edges }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [nodes, edges, onChange]);

  // Handle active node highlighting based on currentTime
  useEffect(() => {
    let closestNode: any = null;
    let minDiff = Infinity;

    nodes.forEach(node => {
      if (node.data.timestamp !== undefined) {
        const diff = currentTime - node.data.timestamp;
        if (diff >= 0 && diff < minDiff) {
          minDiff = diff;
          closestNode = node;
        }
      }
    });

    if (closestNode && closestNode.id !== activeNodeId) {
      setActiveNodeId(closestNode.id);
      
      // Update nodes style for glow effect
      setNodes(nds => nds.map(n => ({
        ...n,
        style: n.id === closestNode.id 
          ? { ...n.style, boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)', borderColor: '#3b82f6' }
          : { ...n.style, boxShadow: 'none', borderColor: '#e5e7eb' }
      })));

      // Pan to node smoothly
      if (closestNode.position) {
        setCenter(closestNode.position.x + 150, closestNode.position.y + 100, { zoom: 1, duration: 800 });
      }
    }
  }, [currentTime, nodes, activeNodeId, setCenter, setNodes]);

  return (
    <div className="w-full h-[calc(100vh-120px)] bg-gray-50 dark:bg-[#1A1A1A] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap nodeColor={(n) => n.id === activeNodeId ? '#3b82f6' : '#e5e7eb'} />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
}

export default function CanvasEditor(props: CanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlow {...props} />
    </ReactFlowProvider>
  );
}
