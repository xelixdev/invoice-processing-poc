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
import { ApprovalRule } from '@/lib/mock-approval-rules'

interface RuleBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  editingRule?: any // Will be properly typed later
  onRuleSaved?: () => void // Callback to refresh the rules table
}

// Transform the ParsedRule from natural language input to backend format
interface ParsedRule {
  trigger: {
    type: string
    description: string
  }
  conditions: Array<{
    field: string
    operator: string
    value: string
    valueMax?: string
  }>
  actions: Array<{
    type: string
    target?: string
    message?: string
  }>
  confidence: number
  entities: any[]
}

export default function RuleBuilderModal({ isOpen, onClose, editingRule, onRuleSaved }: RuleBuilderModalProps) {
  const [ruleName, setRuleName] = useState(editingRule?.name || '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [workflowNodes, setWorkflowNodes] = useState<Node[]>([])
  const [workflowEdges, setWorkflowEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isTestModeOpen, setIsTestModeOpen] = useState(false)
  const [executionPath, setExecutionPath] = useState<string[]>([])
  const [currentExecutingNode, setCurrentExecutingNode] = useState<string>('')
  const [showNaturalLanguage, setShowNaturalLanguage] = useState(true)
  const [naturalLanguageDescription, setNaturalLanguageDescription] = useState('')
  const [originalParsedRule, setOriginalParsedRule] = useState<ParsedRule | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Reset modal state when opening for a new rule
  useEffect(() => {
    if (isOpen && !editingRule) {
      // Reset all state to defaults
      setRuleName('')
      setHasUnsavedChanges(false)
      setWorkflowNodes([])
      setWorkflowEdges([])
      setSelectedNode(null)
      setIsTestModeOpen(false)
      setExecutionPath([])
      setCurrentExecutingNode('')
      setShowNaturalLanguage(true)
      setNaturalLanguageDescription('')
      setOriginalParsedRule(null)
      setIsSaving(false)
    }
  }, [isOpen, editingRule])

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

  const transformToBackendFormat = (parsedRule: ParsedRule, ruleName: string) => {
    // Extract department from actions
    let functionAssignees = 'Procurement' // default
    let userRuleset = 'round_robin' // default
    
    // Find route-to-user action to determine department
    const routeAction = parsedRule.actions.find(action => action.type === 'route-to-user')
    if (routeAction?.target) {
      const target = routeAction.target.toLowerCase()
      // Map common targets to departments
      if (target.includes('cto') || target.includes('engineering') || target.includes('it')) {
        functionAssignees = 'IT'
      } else if (target.includes('cfo') || target.includes('finance')) {
        functionAssignees = 'Finance'
      } else if (target.includes('legal')) {
        functionAssignees = 'Legal'
      } else if (target.includes('marketing')) {
        functionAssignees = 'Sales'
      } else if (target.includes('hr') || target.includes('human resources')) {
        functionAssignees = 'HR'
      } else if (target.includes('operations')) {
        functionAssignees = 'Operations'
      } else if (target.includes('warehouse')) {
        functionAssignees = 'Warehouse'
      }
    }
    
    // Also check department conditions
    const deptCondition = parsedRule.conditions.find(condition => condition.field === 'department')
    if (deptCondition) {
      const dept = deptCondition.value.toLowerCase()
      if (dept.includes('it') || dept.includes('engineering')) {
        functionAssignees = 'IT'
      } else if (dept.includes('finance')) {
        functionAssignees = 'Finance'
      } else if (dept.includes('legal')) {
        functionAssignees = 'Legal'
      } else if (dept.includes('marketing') || dept.includes('sales')) {
        functionAssignees = 'Sales'
      } else if (dept.includes('hr') || dept.includes('human resources')) {
        functionAssignees = 'HR'
      } else if (dept.includes('operations')) {
        functionAssignees = 'Operations'
      } else if (dept.includes('warehouse')) {
        functionAssignees = 'Warehouse'
      }
    }

    // Build natural language rule description
    let ruleDescription = ''
    
    // Add conditions
    if (parsedRule.conditions.length > 0) {
      const conditionTexts = parsedRule.conditions.map(condition => {
        switch (condition.operator) {
          case '>':
            return `amount is greater than $${condition.value}`
          case '<':
            return `amount is less than $${condition.value}`
          case '=':
            return `${condition.field} equals "${condition.value}"`
          case 'contains':
            return `${condition.field} contains "${condition.value}"`
          case 'between':
            return `amount is between $${condition.value} and $${condition.valueMax}`
          default:
            return `${condition.field} ${condition.operator} ${condition.value}`
        }
      })
      ruleDescription = `If ${conditionTexts.join(' and ')}`
    } else {
      ruleDescription = `For all invoices`
    }
    
    // Add actions
    if (parsedRule.actions.length > 0) {
      const actionTexts = parsedRule.actions.map(action => {
        switch (action.type) {
          case 'route-to-user':
            return `route to ${action.target}`
          case 'send-notification':
            return `notify ${action.target}`
          case 'approve':
            return 'automatically approve'
          default:
            return action.type
        }
      })
      ruleDescription += `, then ${actionTexts.join(' and ')}`
    }

    return {
      name: ruleName,
      rule: ruleDescription,
      function_assignees: functionAssignees,
      user_ruleset: userRuleset,
      priority: 100 // default priority
    }
  }

  const handleSave = async () => {
    if (!originalParsedRule && workflowNodes.length === 0) {
      alert('Please create a rule before saving.')
      return
    }

    if (!ruleName.trim()) {
      alert('Please enter a rule name before saving.')
      titleInputRef.current?.focus()
      return
    }

    setIsSaving(true)
    try {
      let ruleData
      
      if (originalParsedRule) {
        // Use the natural language parsed rule
        ruleData = transformToBackendFormat(originalParsedRule, ruleName)
      } else {
        // Transform visual workflow to backend format (simplified for now)
        const routeNode = workflowNodes.find(node => node.type === 'action' && node.data?.actionType === 'route-to-user')
        const conditionNodes = workflowNodes.filter(node => node.type === 'condition')
        
        // Build a simple rule description from the visual workflow
        let ruleDescription = 'Visual workflow rule'
        if (conditionNodes.length > 0) {
          const conditions = conditionNodes.map(node => {
            const { conditionType, operator, value } = node.data || {}
            return `${conditionType} ${operator} ${value}`
          }).join(' and ')
          ruleDescription = `If ${conditions}`
        }
        
        ruleData = {
          name: ruleName,
          rule: ruleDescription,
          function_assignees: routeNode?.data?.department || 'Procurement',
          user_ruleset: 'round_robin',
          priority: 100
        }
      }

      const response = await fetch('/api/assignment-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to save rule: ${response.status}`)
      }

      const savedRule = await response.json()
      console.log('Rule saved successfully:', savedRule)
      
      setHasUnsavedChanges(false)
      
      // Call the callback to refresh the rules table
      if (onRuleSaved) {
        onRuleSaved()
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving rule:', error)
      alert(`Error saving rule: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
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

  const transformParsedRuleToApprovalRule = (parsedRule: ParsedRule): ApprovalRule => {
    // Extract conditions from the parsed rule
    const conditions: ApprovalRule['conditions'] = {}
    
    parsedRule.conditions.forEach(condition => {
      switch (condition.field) {
        case 'amount':
          if (!conditions.amountRange) conditions.amountRange = {}
          if (condition.operator === '>') {
            conditions.amountRange.min = parseInt(condition.value)
          } else if (condition.operator === '<') {
            conditions.amountRange.max = parseInt(condition.value)
          } else if (condition.operator === 'between' && condition.valueMax) {
            conditions.amountRange.min = parseInt(condition.value)
            conditions.amountRange.max = parseInt(condition.valueMax)
          }
          break
        case 'department':
          if (!conditions.department) conditions.department = []
          conditions.department.push(condition.value)
          break
        case 'vendor':
          if (!conditions.vendor) conditions.vendor = []
          conditions.vendor.push(condition.value)
          break
        case 'category':
          if (!conditions.category) conditions.category = []
          conditions.category.push(condition.value)
          break
      }
    })
    
    // Extract approvers from actions
    const approvers: ApprovalRule['approvers'] = { primary: [] }
    parsedRule.actions.forEach(action => {
      if (action.type === 'route-to-user' && action.target) {
        approvers.primary.push(action.target)
      }
    })
    
    return {
      id: 'temp',
      name: ruleName || 'Generated Rule',
      description: `Rule generated from: "${parsedRule.trigger.description}"`,
      priority: 100,
      status: 'draft',
      createdBy: 'Current User',
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      invoicesProcessed: 0,
      conditions,
      approvers
    }
  }

  const handleRuleGenerated = (rule: ParsedRule) => {
    // Store the original parsed rule for saving
    setOriginalParsedRule(rule)
    
    // Transform ParsedRule to ApprovalRule format for workflow generation
    const approvalRule = transformParsedRuleToApprovalRule(rule)
    const { nodes, edges } = generateWorkflowFromRule(approvalRule)
    
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
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-700 flex items-center gap-1.5 text-sm h-8"
            >
              <Check className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save Rule'}
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
              {/* Rule Name Section */}
              <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={ruleName}
                  onChange={(e) => {
                    setRuleName(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="e.g., 'High Value IT Equipment', 'Marketing Expense Approval', 'Engineering Software Licenses'"
                  className={`text-base ${!ruleName.trim() ? 'border-gray-300 focus:border-violet-400 focus:ring-violet-400' : 'border-violet-300 focus:border-violet-400 focus:ring-violet-400'}`}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs ${!ruleName.trim() ? 'text-gray-500' : 'text-gray-600'}`}>
                    {!ruleName.trim() ? 'Rule name is required' : '💡 Choose a clear, descriptive name that explains what this rule handles.'}
                  </p>
                  <span className="text-xs text-gray-500">
                    {ruleName.length}/100
                  </span>
                </div>
              </div>

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