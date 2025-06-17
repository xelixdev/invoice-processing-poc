'use client'

import { useCallback, useRef, useState, useEffect, DragEvent } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  XYPosition,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { nodeTypes } from './workflow-nodes'

interface WorkflowCanvasProps {
  nodes?: Node[]
  edges?: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onNodeSelect?: (node: Node | null) => void
  executionPath?: string[]
  currentExecutingNode?: string
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

function WorkflowCanvasInner({ nodes: propNodes, edges: propEdges, onNodesChange, onEdgesChange, onNodeSelect, executionPath, currentExecutingNode }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesStateChange] = useNodesState(propNodes || initialNodes)
  const [edges, setEdges, onEdgesStateChange] = useEdgesState(propEdges || initialEdges)

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Handle node deletion
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      
      // Clear selection if deleted node was selected
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
        onNodeSelect?.(null)
      }
    },
    [setNodes, setEdges, selectedNode, onNodeSelect]
  )

  // Sync with props when they change
  useEffect(() => {
    if (propNodes && propNodes.length > 0) {
      // Add delete handlers to nodes when they come from props
      const nodesWithHandlers = propNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onDelete: handleDeleteNode
        }
      }))
      setNodes(nodesWithHandlers)
      // Fit view when new nodes are added
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 50 })
        }, 100)
      }
    }
  }, [propNodes, setNodes, reactFlowInstance, handleDeleteNode])

  useEffect(() => {
    if (propEdges) {
      setEdges(propEdges)
    }
  }, [propEdges, setEdges])

  // Handle node connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'default',
        animated: true,
        style: { 
          stroke: 'url(#edge-gradient)',
          strokeWidth: 2 
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#f472b6',
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // Handle drag over (required for drop to work)
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Helper function to check if two nodes are close enough for auto-connection
  const getDistanceBetweenNodes = (node1: Node, node2: Node) => {
    const dx = node1.position.x - node2.position.x
    const dy = node1.position.y - node2.position.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Helper function to find the closest node that can be connected
  const findClosestConnectableNode = (newNode: Node, nodes: Node[], proximityThreshold = 200) => {
    let closestNode = null
    let minDistance = proximityThreshold

    for (const node of nodes) {
      // Skip if it's the same node
      if (node.id === newNode.id) continue

      // Check if connection is valid based on node types
      const canConnect = 
        (node.type === 'trigger' && (newNode.type === 'condition' || newNode.type === 'action')) ||
        (node.type === 'condition' && newNode.type === 'action') ||
        (newNode.type === 'trigger' && (node.type === 'condition' || node.type === 'action')) ||
        (newNode.type === 'condition' && node.type === 'action')

      if (!canConnect) continue

      const distance = getDistanceBetweenNodes(newNode, node)
      
      // Remove restrictive vertical distance requirement and just use proximity
      if (distance < minDistance) {
        // Check if there's already a connection
        const connectionExists = edges.some(edge => 
          (edge.source === node.id && edge.target === newNode.id) ||
          (edge.source === newNode.id && edge.target === node.id)
        )
        
        if (!connectionExists) {
          closestNode = node
          minDistance = distance
        }
      }
    }

    return closestNode
  }

  // Handle drop from palette
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const nodeData = event.dataTransfer.getData('application/reactflow')
      
      if (!nodeData || !reactFlowBounds || !reactFlowInstance) {
        return
      }

      const { nodeType, label, id: nodeId } = JSON.parse(nodeData)
      
      // Check if we're trying to add a trigger when one already exists
      if (nodeType === 'trigger') {
        const existingTrigger = nodes.find(node => node.type === 'trigger')
        if (existingTrigger) {
          // Show a brief visual feedback that multiple triggers aren't allowed
          const dropZone = reactFlowWrapper.current
          if (dropZone) {
            dropZone.style.backgroundColor = '#fef2f2'
            dropZone.style.borderColor = '#fca5a5'
            dropZone.style.borderWidth = '2px'
            dropZone.style.borderStyle = 'dashed'
            
            setTimeout(() => {
              dropZone.style.backgroundColor = ''
              dropZone.style.borderColor = ''
              dropZone.style.borderWidth = ''
              dropZone.style.borderStyle = ''
            }, 1000)
          }
          return
        }
      }
      
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNodeId = `${nodeType}-${Date.now()}`
      const newNode: Node = {
        id: newNodeId,
        type: nodeType,
        position,
        data: {
          label,
          type: nodeId,
          onDelete: handleDeleteNode,
          id: newNodeId,
        },
      }

      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode)
        
        // Check for auto-connection after a brief delay to ensure node is added
        setTimeout(() => {
          const closestNode = findClosestConnectableNode(newNode, nodes, 200)
          if (closestNode) {
            // Determine connection direction based on node types
            let sourceId = ''
            let targetId = ''
            
            if (closestNode.type === 'trigger' || 
                (closestNode.type === 'condition' && newNode.type === 'action')) {
              sourceId = closestNode.id
              targetId = newNodeId
            } else {
              sourceId = newNodeId
              targetId = closestNode.id
            }
            
            const newEdge = {
              id: `${sourceId}-${targetId}`,
              source: sourceId,
              target: targetId,
              type: 'default',
              animated: true,
              style: { 
                stroke: 'url(#edge-gradient)',
                strokeWidth: 2 
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#a78bfa',
              },
            }
            
            setEdges((eds) => [...eds, newEdge])
          }
        }, 50)
        
        return updatedNodes
      })
    },
    [reactFlowInstance, setNodes, nodes, edges, setEdges]
  )

  // Handle node selection
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
      onNodeSelect?.(node)
    },
    [onNodeSelect]
  )

  // Handle canvas click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
    onNodeSelect?.(null)
  }, [onNodeSelect])

  // Update nodes with delete handler and execution state when they change
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesStateChange(changes)
    },
    [onNodesStateChange]
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesStateChange(changes)
      onEdgesChange?.(edges)
    },
    [onEdgesStateChange, edges, onEdgesChange]
  )

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        connectionRadius={50}
        attributionPosition="bottom-right"
      >
        <svg style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
        </svg>
        <Controls className="bg-white border border-gray-200 rounded-md" />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#e5e7eb"
        />
      </ReactFlow>
      
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 mb-2">Start Building Your Rule</div>
            <p className="text-gray-500 max-w-sm mb-4">
              Drag components from the left panel to begin creating your approval workflow.
            </p>
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg max-w-md">
              <strong>Tip:</strong> Start with a trigger, then add conditions and actions. Each rule needs exactly one trigger.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}