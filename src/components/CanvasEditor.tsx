import { useState, useCallback, useEffect } from 'react';
import dagre from 'dagre';
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

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Use slightly larger dimensions for the rich nodes
  const nodeWidth = 320;
  const nodeHeight = 150;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function CanvasFlow({ initialData, onChange, onPlayNode, currentTime }: CanvasEditorProps) {
  const { setCenter } = useReactFlow();
  
  let parsedData = { nodes: [], edges: [] };
  try {
    const raw = initialData ? JSON.parse(initialData) : null;
    if (raw && Array.isArray(raw.nodes)) {
      parsedData.nodes = raw.nodes;
    } else if (raw && raw.graph && Array.isArray(raw.graph.nodes)) {
      parsedData = raw.graph;
    } else if (raw && raw.graphData && Array.isArray(raw.graphData.nodes)) {
      parsedData = raw.graphData;
    }
    if (raw && Array.isArray(raw.edges)) parsedData.edges = raw.edges;
  } catch (e) {
    console.error("Failed to parse initialData", e);
  }
  
  // Inject onPlay callback into nodes and format for CustomNode
  const rawNodes = parsedData.nodes.map((node: any) => {
    const nodeData = { 
      ...(node.data || {}), 
      title: node.title || node.data?.title,
      content: node.content || node.data?.content,
      quotes: node.quotes || node.data?.quotes,
      details: node.details || node.data?.details,
      timestamp: node.timestamp || node.data?.timestamp,
      onPlay: onPlayNode 
    };
    return {
      ...node,
      type: 'custom',
      // Provide default position so ReactFlow doesn't break; dagre will override below
      position: node.position ?? { x: 0, y: 0 },
      data: nodeData
    };
  });

  // Pre-compute dagre layout synchronously so ReactFlow gets valid positions on first render
  const needsLayout = rawNodes.length > 0 && (!rawNodes[0].position || rawNodes[0].position.x === 0);
  let initialNodes = rawNodes;
  let initialEdges: any[] = parsedData.edges || [];
  if (needsLayout && rawNodes.length > 0) {
    const { nodes: ln, edges: le } = getLayoutedElements(rawNodes, initialEdges);
    initialNodes = ln;
    initialEdges = le;
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Auto-fit view on first load
  useEffect(() => {
    if (nodes.length > 0) {
      window.requestAnimationFrame(() => {
        try {
          setCenter(nodes[0].position.x + 160, nodes[0].position.y + 75, { zoom: 0.8, duration: 600 });
        } catch (_) {}
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  const onLayout = useCallback(
    (direction = 'TB') => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      if (layoutedNodes.length > 0) {
        window.requestAnimationFrame(() => {
          setCenter(layoutedNodes[0].position.x + 150, layoutedNodes[0].position.y + 100, { zoom: 0.8, duration: 800 });
        });
      }
    },
    [nodes, edges, setNodes, setEdges, setCenter]
  );

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
    <div className="w-full h-full min-h-screen bg-gray-50 dark:bg-[#1A1A1A] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <div className="absolute top-4 left-4 z-10 flex gap-2 shadow-sm rounded-lg bg-white/80 dark:bg-black/50 backdrop-blur-md p-1 border border-gray-200 dark:border-gray-800">
          <button onClick={() => onLayout('TB')} className="px-3 py-1.5 text-xs font-semibold rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
            ⬇️ 垂直排版
          </button>
          <button onClick={() => onLayout('LR')} className="px-3 py-1.5 text-xs font-semibold rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
            ➡️ 水平排版
          </button>
        </div>
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
