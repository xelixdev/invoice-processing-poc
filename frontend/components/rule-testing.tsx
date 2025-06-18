'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  FileText, 
  AlertTriangle,
  Zap,
  Filter,
  Send,
  Users,
  TrendingUp
} from 'lucide-react'
import { Node, Edge } from 'reactflow'
import { approverEngine, ApprovalRequest } from '@/lib/dynamic-approver-engine'
import { users, getUserById } from '@/lib/mock-organization-data'

interface TestInvoiceData {
  amount: number
  department: string
  vendor: string
  project: string
  category: string
  invoiceType: 'non-po' | 'po-backed' | 'gr-matched'
  description: string
  requesterId?: string
  urgency?: 'low' | 'medium' | 'high'
}

interface TestExecutionStep {
  nodeId: string
  nodeType: string
  nodeLabel: string
  status: 'pending' | 'processing' | 'passed' | 'failed' | 'skipped'
  result?: any
  message?: string
  executionTime?: number
}

interface TestResult {
  status: 'passed' | 'failed' | 'incomplete'
  finalAction?: string
  executionPath: TestExecutionStep[]
  totalTime: number
  error?: string
}

interface RuleTestingProps {
  nodes: Node[]
  edges: Edge[]
  onExecutionPathUpdate?: (path: TestExecutionStep[]) => void
}

export function RuleTesting({ nodes, edges, onExecutionPathUpdate }: RuleTestingProps) {
  const [testData, setTestData] = useState<TestInvoiceData>({
    amount: 15000,
    department: 'Marketing',
    vendor: 'Acme Corp',
    project: 'Phoenix',
    category: 'Software',
    invoiceType: 'non-po',
    description: 'Annual marketing software subscription',
    requesterId: 'marketing-coord-001', // Ashley Brown
    urgency: 'medium'
  })
  
  const [isExecuting, setIsExecuting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(-1)

  // Sample test data presets
  const testPresets = [
    {
      name: 'High Value Marketing',
      data: {
        amount: 15000,
        department: 'Marketing',
        vendor: 'Acme Corp',
        project: 'Phoenix',
        category: 'Software',
        invoiceType: 'non-po' as const,
        description: 'Annual marketing software subscription',
        requesterId: 'marketing-coord-001', // Ashley Brown
        urgency: 'medium' as const
      }
    },
    {
      name: 'Low Value IT Purchase',
      data: {
        amount: 500,
        department: 'Engineering',
        vendor: 'Tech Solutions',
        project: 'Infrastructure',
        category: 'Hardware',
        invoiceType: 'po-backed' as const,
        description: 'Office equipment purchase',
        requesterId: 'it-engineer-001', // Maria Garcia
        urgency: 'low' as const
      }
    },
    {
      name: 'Legal Services',
      data: {
        amount: 8500,
        department: 'Legal',
        vendor: 'Law Firm LLC',
        project: 'Compliance',
        category: 'Services',
        invoiceType: 'non-po' as const,
        description: 'Legal consultation services',
        requesterId: 'legal-counsel-001', // James Miller
        urgency: 'high' as const
      }
    },
    {
      name: 'Finance Emergency',
      data: {
        amount: 75000,
        department: 'Finance',
        vendor: 'Emergency Vendor',
        project: 'Crisis Response',
        category: 'Services',
        invoiceType: 'non-po' as const,
        description: 'Emergency financial consulting',
        requesterId: 'accountant-001', // Emma Davis
        urgency: 'high' as const
      }
    }
  ]

  const executeRule = async () => {
    if (nodes.length === 0) {
      setTestResult({
        status: 'failed',
        executionPath: [],
        totalTime: 0,
        error: 'No workflow nodes to execute'
      })
      return
    }

    setIsExecuting(true)
    setCurrentStep(0)
    
    const startTime = Date.now()
    const executionPath: TestExecutionStep[] = []

    try {
      // Find trigger node (starting point)
      const triggerNode = nodes.find(node => node.type === 'trigger')
      if (!triggerNode) {
        throw new Error('No trigger node found. Every rule must start with a trigger.')
      }

      // Build execution path by following edges
      let currentNodeId = triggerNode.id
      let stepIndex = 0

      while (currentNodeId) {
        const currentNode = nodes.find(node => node.id === currentNodeId)
        if (!currentNode) break

        setCurrentStep(stepIndex)
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 800))

        const step: TestExecutionStep = {
          nodeId: currentNode.id,
          nodeType: currentNode.type,
          nodeLabel: currentNode.data.label || currentNode.type,
          status: 'processing',
          executionTime: Date.now() - startTime
        }

        // Execute node logic
        const nodeResult = executeNode(currentNode, testData)
        step.status = nodeResult.passed ? 'passed' : 'failed'
        step.result = nodeResult.result
        step.message = nodeResult.message

        executionPath.push(step)
        onExecutionPathUpdate?.(executionPath)

        // If condition failed, stop execution
        if (!nodeResult.passed && currentNode.type === 'condition') {
          break
        }

        // Find next node
        const nextEdge = edges.find(edge => edge.source === currentNodeId)
        currentNodeId = nextEdge?.target || null
        stepIndex++
      }

      const totalTime = Date.now() - startTime
      const finalStep = executionPath[executionPath.length - 1]
      
      setTestResult({
        status: finalStep?.status === 'passed' ? 'passed' : 'failed',
        finalAction: finalStep?.nodeType === 'action' ? finalStep.result : undefined,
        executionPath,
        totalTime
      })

    } catch (error) {
      setTestResult({
        status: 'failed',
        executionPath,
        totalTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExecuting(false)
      setCurrentStep(-1)
    }
  }

  const executeNode = (node: Node, data: TestInvoiceData) => {
    switch (node.type) {
      case 'trigger':
        return {
          passed: true,
          result: 'Invoice received and rule triggered',
          message: `Processing invoice for ${data.amount} from ${data.vendor}`
        }
        
      case 'condition':
        return executeCondition(node, data)
        
      case 'action':
        return executeAction(node, data)
        
      default:
        return {
          passed: false,
          result: null,
          message: `Unknown node type: ${node.type}`
        }
    }
  }

  const executeCondition = (node: Node, data: TestInvoiceData) => {
    const { conditionType, operator, value, valueMax } = node.data
    
    let actualValue: any
    let passed = false
    let message = ''

    // Get the field value to check
    switch (conditionType) {
      case 'amount':
        actualValue = data.amount
        break
      case 'department':
        actualValue = data.department
        break
      case 'vendor':
        actualValue = data.vendor
        break
      case 'project':
        actualValue = data.project
        break
      default:
        actualValue = null
    }

    // Evaluate condition
    switch (operator) {
      case '>':
        passed = Number(actualValue) > Number(value)
        message = `${actualValue} ${passed ? '>' : '≤'} ${value}`
        break
      case '<':
        passed = Number(actualValue) < Number(value)
        message = `${actualValue} ${passed ? '<' : '≥'} ${value}`
        break
      case '>=':
        passed = Number(actualValue) >= Number(value)
        message = `${actualValue} ${passed ? '≥' : '<'} ${value}`
        break
      case '<=':
        passed = Number(actualValue) <= Number(value)
        message = `${actualValue} ${passed ? '≤' : '>'} ${value}`
        break
      case '=':
        passed = String(actualValue).toLowerCase() === String(value).toLowerCase()
        message = `"${actualValue}" ${passed ? '=' : '≠'} "${value}"`
        break
      case '!=':
        passed = String(actualValue).toLowerCase() !== String(value).toLowerCase()
        message = `"${actualValue}" ${passed ? '≠' : '='} "${value}"`
        break
      case 'contains':
        passed = String(actualValue).toLowerCase().includes(String(value).toLowerCase())
        message = `"${actualValue}" ${passed ? 'contains' : 'does not contain'} "${value}"`
        break
      case 'between':
        passed = Number(actualValue) >= Number(value) && Number(actualValue) <= Number(valueMax)
        message = `${actualValue} ${passed ? 'is' : 'is not'} between ${value} and ${valueMax}`
        break
      default:
        passed = false
        message = `Unknown operator: ${operator}`
    }

    return {
      passed,
      result: passed ? 'Condition met' : 'Condition not met',
      message
    }
  }

  const executeAction = (node: Node, data: TestInvoiceData) => {
    const { actionType, target, message, reason, priority, dynamicStrategy, approvalTeam, targetDepartment } = node.data
    
    switch (actionType) {
      case 'route-to-user':
        // Static user assignment
        const user = getUserById(target)
        if (!user) {
          return {
            passed: false,
            result: null,
            message: `User not found: ${target}`
          }
        }
        
        return {
          passed: true,
          result: `Routed to ${user.name}`,
          message: `Invoice routed to ${user.name} (${user.title}) - Workload: ${user.currentWorkload}/${user.maxWorkload} (Priority: ${priority || 'medium'})`
        }
        
      case 'dynamic-assignment':
        // Use dynamic approver engine
        const approvalRequest: ApprovalRequest = {
          invoiceAmount: data.amount,
          department: data.department,
          requesterId: data.requesterId,
          category: data.category,
          urgency: data.urgency
        }
        
        let approvalResult = null
        
        switch (dynamicStrategy) {
          case 'manager-lookup':
            if (data.requesterId) {
              approvalResult = approverEngine.findManagerApprover(data.requesterId)
            }
            break
          case 'round-robin':
            if (approvalTeam) {
              approvalResult = approverEngine.assignRoundRobin(approvalTeam, approvalRequest)
            }
            break
          case 'load-balance':
            if (approvalTeam) {
              approvalResult = approverEngine.assignLoadBalanced(approvalTeam, approvalRequest)
            }
            break
          case 'hierarchical':
            approvalResult = approverEngine.assignHierarchical(approvalRequest)
            break
          case 'department-head':
            if (targetDepartment) {
              approvalResult = approverEngine.assignDepartmentHead(targetDepartment)
            }
            break
        }
        
        if (!approvalResult) {
          return {
            passed: false,
            result: null,
            message: `Dynamic assignment failed: No available approver found using ${dynamicStrategy} strategy`
          }
        }
        
        return {
          passed: true,
          result: `Dynamically assigned to ${approvalResult.assignedUser.name}`,
          message: `${approvalResult.reason} - Est. processing time: ${approvalResult.estimatedProcessingTime}h${approvalResult.backupApprovers?.length ? ` (${approvalResult.backupApprovers.length} backup approvers available)` : ''}`
        }
        
      case 'send-notification':
        const notifyUser = getUserById(target)
        return {
          passed: true,
          result: `Notification sent to ${notifyUser?.name || target}`,
          message: `Notification sent to ${notifyUser?.name} (${notifyUser?.email}): "${message || 'Invoice requires your attention'}"`
        }
        
      case 'approve':
        return {
          passed: true,
          result: 'Auto-approved',
          message: `Invoice auto-approved. Reason: ${reason || 'Rule conditions met'}`
        }
        
      default:
        return {
          passed: false,
          result: null,
          message: `Unknown action type: ${actionType}`
        }
    }
  }

  const loadPreset = (preset: typeof testPresets[0]) => {
    setTestData(preset.data)
    setTestResult(null)
  }

  const getStepIcon = (step: TestExecutionStep) => {
    switch (step.nodeType) {
      case 'trigger':
        return <Zap className="h-4 w-4" />
      case 'condition':
        return <Filter className="h-4 w-4" />
      case 'action':
        return <Send className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStepStatusIcon = (status: TestExecutionStep['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Test Data Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Test Invoice Data
          </CardTitle>
          <CardDescription>
            Configure test invoice data to simulate rule execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Test Presets */}
            <div>
              <Label className="text-sm font-medium">Quick Presets</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {testPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => loadPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Manual Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-amount">Amount ($)</Label>
                <Input
                  id="test-amount"
                  type="number"
                  value={testData.amount}
                  onChange={(e) => setTestData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <Label htmlFor="test-department">Department</Label>
                <Select
                  value={testData.department}
                  onValueChange={(value) => setTestData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-requester">Submitted By</Label>
                <Select
                  value={testData.requesterId || ''}
                  onValueChange={(value) => setTestData(prev => ({ ...prev, requesterId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select requester..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center space-x-2">
                          <span>{user.avatar}</span>
                          <div>
                            <div>{user.name}</div>
                            <div className="text-xs text-gray-500">{user.title} - {user.department}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-urgency">Urgency</Label>
                <Select
                  value={testData.urgency || 'medium'}
                  onValueChange={(value: any) => setTestData(prev => ({ ...prev, urgency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-vendor">Vendor</Label>
                <Input
                  id="test-vendor"
                  value={testData.vendor}
                  onChange={(e) => setTestData(prev => ({ ...prev, vendor: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="test-project">Project</Label>
                <Input
                  id="test-project"
                  value={testData.project}
                  onChange={(e) => setTestData(prev => ({ ...prev, project: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="test-category">Category</Label>
                <Select
                  value={testData.category}
                  onValueChange={(value) => setTestData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-type">Invoice Type</Label>
                <Select
                  value={testData.invoiceType}
                  onValueChange={(value: any) => setTestData(prev => ({ ...prev, invoiceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-po">Non-PO</SelectItem>
                    <SelectItem value="po-backed">PO-Backed</SelectItem>
                    <SelectItem value="gr-matched">GR-Matched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="test-description">Description</Label>
              <Input
                id="test-description"
                value={testData.description}
                onChange={(e) => setTestData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Invoice description..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Execution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            Rule Execution
          </CardTitle>
          <CardDescription>
            Run the test to see how your rule processes the invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={executeRule}
            disabled={isExecuting || nodes.length === 0}
            className="bg-violet-600 hover:bg-violet-700 flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isExecuting ? 'Executing...' : 'Run Test'}
          </Button>

          {nodes.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Add some workflow nodes to test the rule execution.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {testResult.status === 'passed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
            <CardDescription>
              Execution completed in {testResult.totalTime}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Result */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {testResult.status === 'passed' ? 'Test Passed' : 'Test Failed'}
                  </div>
                  {testResult.finalAction && (
                    <div className="text-sm text-gray-600">Final Action: {testResult.finalAction}</div>
                  )}
                  {testResult.error && (
                    <div className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {testResult.error}
                    </div>
                  )}
                </div>
                <Badge variant={testResult.status === 'passed' ? 'default' : 'destructive'}>
                  {testResult.status}
                </Badge>
              </div>

              {/* Execution Path */}
              <div>
                <h4 className="font-medium mb-3">Execution Path</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {testResult.executionPath.map((step, index) => (
                      <div key={step.nodeId} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStepIcon(step)}
                          {getStepStatusIcon(step.status)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{step.nodeLabel}</div>
                          <div className="text-xs text-gray-600">{step.message}</div>
                        </div>
                        {index < testResult.executionPath.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}