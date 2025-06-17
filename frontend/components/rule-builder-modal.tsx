'use client'

import { useState, useEffect, useRef, DragEvent } from 'react'
import { X, Save, Play, Zap, Filter, Send, CheckCircle, Edit3, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import WorkflowCanvas from './workflow-canvas'
import { NodePropertyEditor } from './node-property-editors'
import TestModeModal from './test-mode-modal'
import NaturalLanguageInput from './natural-language-input'
import { generateWorkflowFromRule, generateNaturalLanguageFromWorkflow } from '@/lib/workflow-generator'
import { Node, Edge } from 'reactflow'

interface RuleBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  editingRule?: any // Will be properly typed later
}

export default function RuleBuilderModal({ isOpen, onClose, editingRule }: RuleBuilderModalProps) {
  const [ruleName, setRuleName] = useState(editingRule?.name || 'New Approval Rule')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [workflowNodes, setWorkflowNodes] = useState<Node[]>([])
  const [workflowEdges, setWorkflowEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isTestModeOpen, setIsTestModeOpen] = useState(false)
  const [executionPath, setExecutionPath] = useState<string[]>([])
  const [currentExecutingNode, setCurrentExecutingNode] = useState<string>('')
  const [showNaturalLanguage, setShowNaturalLanguage] = useState(true)
  const [naturalLanguageDescription, setNaturalLanguageDescription] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, hasUnsavedChanges])

  if (!isOpen) return null

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?')
      if (!confirmClose) return
    }
    onClose()
  }

  const handleSave = () => {
    // Save logic will be implemented later
    console.log('Saving rule:', ruleName)
    setHasUnsavedChanges(false)
    onClose()
  }

  const handleTest = () => {
    setIsTestModeOpen(true)
  }

  const handleExecutionPathUpdate = (path: any[]) => {
    const nodeIds = path.map(step => step.nodeId)
    setExecutionPath(nodeIds)
    
    // Set current executing node (last processing node)
    const processingStep = path.find(step => step.status === 'processing')
    setCurrentExecutingNode(processingStep?.nodeId || '')
  }

  const handleWorkflowNodesChange = (nodes: Node[]) => {
    setWorkflowNodes(nodes)
    setHasUnsavedChanges(true)
    
    // Update natural language description when workflow changes
    if (nodes.length > 0) {
      const description = generateNaturalLanguageFromWorkflow(nodes, workflowEdges)
      setNaturalLanguageDescription(description)
    }
  }

  const handleWorkflowEdgesChange = (edges: Edge[]) => {
    setWorkflowEdges(edges)
    setHasUnsavedChanges(true)
    
    // Update natural language description when workflow changes
    if (workflowNodes.length > 0) {
      const description = generateNaturalLanguageFromWorkflow(workflowNodes, edges)
      setNaturalLanguageDescription(description)
    }
  }

  const handleRuleGenerated = (rule: any) => {
    const { nodes, edges } = generateWorkflowFromRule(rule)
    
    // Add delete handlers to nodes
    const nodesWithHandlers = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onDelete: (nodeId: string) => {
          setWorkflowNodes(prev => prev.filter(n => n.id !== nodeId))
          setWorkflowEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
        }
      }
    }))
    
    setWorkflowNodes(nodesWithHandlers)
    setWorkflowEdges(edges)
    setHasUnsavedChanges(true)
    setShowNaturalLanguage(false) // Switch to visual mode after generation
  }

  const onDragStart = (event: DragEvent, nodeType: string, label: string, id: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, label, id }))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleNodeSelect = (node: Node | null) => {
    setSelectedNode(node)
  }

  const handlePropertyChange = (nodeId: string, property: string, value: any) => {
    setWorkflowNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, [property]: value } }
          : node
      )
    )
    setHasUnsavedChanges(true)
    
    // Update selected node if it's the one being edited
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prevNode) => 
        prevNode ? { ...prevNode, data: { ...prevNode.data, [property]: value } } : null
      )
    }
  }

  // Node types for the palette
  const paletteNodeTypes = [
    {
      category: 'Triggers',
      nodes: [
        { id: 'invoice-received', name: 'Invoice Received', icon: Zap, color: 'bg-blue-500', nodeType: 'trigger' },
      ]
    },
    {
      category: 'Conditions',
      nodes: [
        { id: 'amount-check', name: 'Amount Check', icon: Filter, color: 'bg-green-500', nodeType: 'condition' },
        { id: 'department-check', name: 'Department Check', icon: Filter, color: 'bg-green-500', nodeType: 'condition' },
        { id: 'vendor-check', name: 'Vendor Check', icon: Filter, color: 'bg-green-500', nodeType: 'condition' },
      ]
    },
    {
      category: 'Actions',
      nodes: [
        { id: 'route-to-user', name: 'Route to User', icon: Send, color: 'bg-purple-500', nodeType: 'action' },
        { id: 'send-notification', name: 'Send Notification', icon: Send, color: 'bg-purple-500', nodeType: 'action' },
        { id: 'approve', name: 'Auto Approve', icon: CheckCircle, color: 'bg-emerald-500', nodeType: 'action' },
      ]
    }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 pl-2">
            <div className="flex items-center space-x-2 group">
              <Input
                ref={titleInputRef}
                value={ruleName}
                onChange={(e) => {
                  setRuleName(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="text-xl font-semibold border-none shadow-none p-0 h-auto bg-transparent focus-visible:ring-0 focus:ring-0 focus:border-none focus:outline-none min-w-0"
                placeholder="New Approval Rule"
                style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}
              />
              <Edit3 
                className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors cursor-pointer" 
                onClick={() => titleInputRef.current?.focus()}
              />
            </div>
            {hasUnsavedChanges && (
              <div className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                Unsaved
              </div>
            )}
          </div>
          
          {/* Mode Toggle - Centered */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={showNaturalLanguage ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowNaturalLanguage(true)}
              className="text-xs h-7"
            >
              Natural Language
            </Button>
            <Button
              variant={!showNaturalLanguage ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowNaturalLanguage(false)}
              className="text-xs h-7"
            >
              Visual Builder
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              className="flex items-center gap-1.5 text-sm h-8"
            >
              <Play className="h-3.5 w-3.5" />
              Test Rule
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-violet-600 hover:bg-violet-700 flex items-center gap-1.5 text-sm h-8"
            >
              <Check className="h-3.5 w-3.5" />
              Save Rule
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {showNaturalLanguage ? (
            /* Natural Language Mode - Single Panel */
            <div className="flex-1 p-6 overflow-auto">
              <NaturalLanguageInput
                onRuleGenerated={handleRuleGenerated}
                onPreviewUpdate={setNaturalLanguageDescription}
              />
              
            </div>
          ) : (
            /* Visual Builder Mode - Three Panel Layout */
            <>
              {/* Left Panel - Node Palette */}
              <div className="w-64 border-r border-gray-200 bg-gray-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Rule Components</h3>
                  <p className="text-sm text-gray-500 mt-1">Drag components to build your rule</p>
                </div>
                
                <ScrollArea className="h-full p-4">
                  <div className="space-y-6">
                    {paletteNodeTypes.map((category) => (
                      <div key={category.category}>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                          {category.category}
                          {category.category === 'Triggers' && workflowNodes.some(n => n.type === 'trigger') && (
                            <span className="ml-2 text-xs text-green-600">(✓ Added)</span>
                          )}
                        </h4>
                        <div className="space-y-2">
                          {category.nodes.map((node) => {
                            const isDisabled = node.nodeType === 'trigger' && workflowNodes.some(n => n.type === 'trigger')
                            return (
                              <div
                                key={node.id}
                                className={`flex items-center p-3 bg-white rounded-lg border border-gray-200 transition-all ${
                                  isDisabled 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'cursor-grab hover:shadow-sm active:cursor-grabbing'
                                }`}
                                draggable={!isDisabled}
                                onDragStart={isDisabled ? undefined : (event) => onDragStart(event, node.nodeType, node.name, node.id)}
                              >
                                <div className={`p-2 rounded-md ${node.color} mr-3`}>
                                  <node.icon className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-900">{node.name}</span>
                                  {isDisabled && (
                                    <div className="text-xs text-gray-500 mt-1">Only one trigger allowed per rule</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Center Panel - Canvas */}
              <div className="flex-1 bg-gray-100 relative">
                <div className="absolute inset-0 p-6">
                  <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <WorkflowCanvas
                      nodes={workflowNodes}
                      edges={workflowEdges}
                      onNodesChange={handleWorkflowNodesChange}
                      onEdgesChange={handleWorkflowEdgesChange}
                      onNodeSelect={handleNodeSelect}
                      executionPath={executionPath}
                      currentExecutingNode={currentExecutingNode}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel - Properties */}
              <div className="w-80 border-l border-gray-200 bg-gray-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Properties</h3>
                  <p className="text-sm text-gray-500 mt-1">Configure selected component</p>
                </div>
                
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <NodePropertyEditor
                      selectedNode={selectedNode}
                      onPropertyChange={handlePropertyChange}
                    />
                    
                    {/* Show natural language description in visual mode */}
                    {workflowNodes.length > 0 && naturalLanguageDescription && (
                      <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                        <h5 className="text-xs font-medium text-violet-900 mb-2">Rule Description:</h5>
                        <p className="text-xs text-violet-800">{naturalLanguageDescription}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to close
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Canvas ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>{workflowNodes.length} nodes</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>{workflowEdges.length} connections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Mode Modal */}
      <TestModeModal
        isOpen={isTestModeOpen}
        onClose={() => setIsTestModeOpen(false)}
        nodes={workflowNodes}
        edges={workflowEdges}
        ruleName={ruleName}
        onExecutionPathUpdate={handleExecutionPathUpdate}
      />
    </div>
  )
}