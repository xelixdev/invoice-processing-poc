'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, X, Sparkles } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface SLARule {
  id: string
  name: string
  naturalLanguageRule: string
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority'
  status: 'Active' | 'Inactive'
  aiProcessed: boolean
  created: string
}

interface StructuredRule {
  id: string
  name: string
  description: string
  condition: string
  threshold: string
  unit: string
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority'
  status: 'Active' | 'Inactive'
  created: string
}

const mockSLARules: SLARule[] = [
  {
    id: '1',
    name: 'High Value Vendor Processing',
    naturalLanguageRule: 'If an invoice from Tech Solutions Inc., Electronics Warehouse, or Furniture Depot is over $25,000 and hasn\'t been posted within 3 days, escalate it as high priority',
    priority: 'High Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  },
  {
    id: '2',
    name: 'Critical Vendor Approval Timeout',
    naturalLanguageRule: 'Escalate any invoice from critical vendors (WOODPECKER SCHOOL & OFFICE SUPPLIES, Office Supplies Co.) that\'s been stuck in approval for more than 2 days, regardless of amount',
    priority: 'Medium Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  }
]

const mockStructuredRules: StructuredRule[] = [
  {
    id: '1',
    name: 'High Value Invoice Processing',
    description: 'Invoices over $5,000 must be processed within 2 days',
    condition: 'Amount > $5,000',
    threshold: '2',
    unit: 'days',
    priority: 'High Priority',
    status: 'Active',
    created: '2025-06-19'
  },
  {
    id: '2',
    name: 'Standard Invoice Processing',
    description: 'Standard invoices must be processed within 5 days',
    condition: 'Amount ≤ $5,000',
    threshold: '5',
    unit: 'days',
    priority: 'Medium Priority',
    status: 'Active',
    created: '2025-06-19'
  },
  {
    id: '3',
    name: 'Approval Timeout',
    description: 'Invoices pending approval for more than 3 days',
    condition: 'Status = Pending Approval',
    threshold: '3',
    unit: 'days',
    priority: 'Medium Priority',
    status: 'Active',
    created: '2025-06-19'
  },
  {
    id: '4',
    name: 'Exception Resolution',
    description: 'Matching exceptions must be resolved within 24 hours',
    condition: 'Has Matching Exception',
    threshold: '24',
    unit: 'hours',
    priority: 'High Priority',
    status: 'Active',
    created: '2025-06-19'
  }
]

export default function SLAConfiguration() {
  const [activeTab, setActiveTab] = useState('AI-Powered')
  const [rules, setRules] = useState<SLARule[]>(mockSLARules)
  const [structuredRules, setStructuredRules] = useState<StructuredRule[]>(mockStructuredRules)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isStructuredModalOpen, setIsStructuredModalOpen] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    naturalLanguageRule: ''
  })
  
  // Structured rule form state
  const [newStructuredRule, setNewStructuredRule] = useState({
    name: '',
    description: '',
    priority: 'Medium Priority',
    conditions: [
      {
        id: '1',
        type: 'Status-based',
        field: 'Current Status',
        operator: 'equals',
        value: ''
      }
    ]
  })

  const handleCreateRule = () => {
    if (newRule.name.trim() && newRule.naturalLanguageRule.trim()) {
      const newSLARule: SLARule = {
        id: Date.now().toString(),
        name: newRule.name,
        naturalLanguageRule: newRule.naturalLanguageRule,
        priority: 'Medium Priority',
        status: 'Active',
        aiProcessed: true,
        created: new Date().toISOString().split('T')[0]
      }
      setRules([...rules, newSLARule])
      setNewRule({ name: '', naturalLanguageRule: '' })
      setIsCreateModalOpen(false)
    }
  }

  const handleCreateStructuredRule = () => {
    if (newStructuredRule.name && newStructuredRule.conditions.length > 0) {
      const structuredRule: StructuredRule = {
        id: Date.now().toString(),
        name: newStructuredRule.name,
        description: newStructuredRule.description,
        condition: newStructuredRule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND '),
        threshold: '3',
        unit: 'days',
        priority: newStructuredRule.priority as 'High Priority' | 'Medium Priority' | 'Low Priority',
        status: 'Active',
        created: new Date().toISOString().split('T')[0]
      }
      setStructuredRules([...structuredRules, structuredRule])
      setNewStructuredRule({
        name: '',
        description: '',
        priority: 'Medium Priority',
        conditions: [
          {
            id: '1',
            type: 'Status-based',
            field: 'Current Status',
            operator: 'equals',
            value: ''
          }
        ]
      })
      setIsStructuredModalOpen(false)
    }
  }

  const addCondition = () => {
    const newCondition = {
      id: Date.now().toString(),
      type: 'Status-based',
      field: 'Current Status',
      operator: 'equals',
      value: ''
    }
    setNewStructuredRule({
      ...newStructuredRule,
      conditions: [...newStructuredRule.conditions, newCondition]
    })
  }

  const updateCondition = (conditionId: string, field: string, value: string) => {
    setNewStructuredRule({
      ...newStructuredRule,
      conditions: newStructuredRule.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, [field]: value } : condition
      )
    })
  }

  const removeCondition = (conditionId: string) => {
    setNewStructuredRule({
      ...newStructuredRule,
      conditions: newStructuredRule.conditions.filter(condition => condition.id !== conditionId)
    })
  }

  const handleDisableRule = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, status: 'Inactive' as const } : rule
    ))
  }

  const handleDisableStructuredRule = (id: string) => {
    setStructuredRules(structuredRules.map(rule => 
      rule.id === id ? { ...rule, status: 'Inactive' as const } : rule
    ))
  }

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High Priority':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'Medium Priority':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Low Priority':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const exampleRules = [
    '"If an invoice from Tech Solutions Inc., Electronics Warehouse, or Furniture Depot is over $25,000 and hasn\'t been posted within 3 days, escalate it as high priority"',
    '"Escalate any invoice from critical vendors (WOODPECKER SCHOOL & OFFICE SUPPLIES, Office Supplies Co.) that\'s been stuck in approval for more than 2 days, regardless of amount"',
    '"If utility invoices (electricity, gas, water) are overdue by more than 7 days, escalate as medium priority to facilities team"'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SLA Configuration</h1>
          <p className="text-gray-600 mt-1">Configure escalation rules using natural language or structured forms</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI-Powered Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 gap-0">
              <div className="flex items-center justify-between p-6 pb-4">
                <div>
                  <DialogTitle className="text-xl font-semibold">Create Rule with Natural Language</DialogTitle>
                  <p className="text-gray-600 mt-1">Describe your escalation rule in plain English. Our system will automatically parse and configure it.</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="px-6 pb-6 space-y-6">
                <div>
                  <Label htmlFor="ruleName" className="text-base font-medium">Rule Name</Label>
                  <Input
                    id="ruleName"
                    placeholder="e.g., High Value Vendor Processing"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="rule" className="text-base font-medium">Describe your rule</Label>
                  <Textarea
                    id="rule"
                    placeholder="e.g., If an invoice from Microsoft or Oracle is over $50,000 and hasn't been approved for 3 days, escalate it as high priority to the CFO"
                    value={newRule.naturalLanguageRule}
                    onChange={(e) => setNewRule({ ...newRule, naturalLanguageRule: e.target.value })}
                    className="mt-2 min-h-[120px] text-base resize-none"
                  />
                </div>

                {/* Example Rules Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">Example rules:</h4>
                  <div className="space-y-2">
                    {exampleRules.map((example, index) => (
                      <div key={index} className="flex items-start">
                        <div className="w-1 h-1 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <p className="text-blue-700 text-sm">{example}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateRule} 
                    className="bg-blue-600 hover:bg-blue-700 px-6"
                    disabled={!newRule.name.trim() || !newRule.naturalLanguageRule.trim()}
                  >
                    Create Rule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isStructuredModalOpen} onOpenChange={setIsStructuredModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Structured Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 gap-0">
              <div className="flex items-center justify-between p-6 pb-4">
                <div>
                  <DialogTitle className="text-xl font-semibold">Create Structured SLA Rule</DialogTitle>
                  <p className="text-gray-600 mt-1">Build a rule using simple conditions - perfect for time-based, amount-based, or status-based escalations</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsStructuredModalOpen(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="ruleName" className="text-base font-medium">Rule Name</Label>
                    <Input
                      id="ruleName"
                      placeholder="e.g., High Value Processing Timeout"
                      value={newStructuredRule.name}
                      onChange={(e) => setNewStructuredRule({...newStructuredRule, name: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority" className="text-base font-medium">Escalation Priority</Label>
                    <Select value={newStructuredRule.priority} onValueChange={(value) => setNewStructuredRule({...newStructuredRule, priority: value})}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High Priority">High Priority</SelectItem>
                        <SelectItem value="Medium Priority">Medium Priority</SelectItem>
                        <SelectItem value="Low Priority">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-medium">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of when this rule applies"
                    value={newStructuredRule.description}
                    onChange={(e) => setNewStructuredRule({...newStructuredRule, description: e.target.value})}
                    className="mt-2 min-h-[80px] text-base resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-medium">Conditions</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCondition}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Condition
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {newStructuredRule.conditions.map((condition, index) => (
                      <div key={condition.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">If Condition {index + 1}</h4>
                          {newStructuredRule.conditions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(condition.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Type</Label>
                            <Select 
                              value={condition.type} 
                              onValueChange={(value) => updateCondition(condition.id, 'type', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Status-based">Status-based</SelectItem>
                                <SelectItem value="Amount-based">Amount-based</SelectItem>
                                <SelectItem value="Time-based">Time-based</SelectItem>
                                <SelectItem value="Vendor-based">Vendor-based</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Field</Label>
                            <Select 
                              value={condition.field} 
                              onValueChange={(value) => updateCondition(condition.id, 'field', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {condition.type === 'Status-based' && (
                                  <>
                                    <SelectItem value="Current Status">Current Status</SelectItem>
                                    <SelectItem value="Approval Status">Approval Status</SelectItem>
                                    <SelectItem value="Processing Status">Processing Status</SelectItem>
                                  </>
                                )}
                                {condition.type === 'Amount-based' && (
                                  <>
                                    <SelectItem value="Invoice Amount">Invoice Amount</SelectItem>
                                    <SelectItem value="Line Item Total">Line Item Total</SelectItem>
                                  </>
                                )}
                                {condition.type === 'Time-based' && (
                                  <>
                                    <SelectItem value="Processing Time">Processing Time</SelectItem>
                                    <SelectItem value="Approval Time">Approval Time</SelectItem>
                                    <SelectItem value="Days Since Receipt">Days Since Receipt</SelectItem>
                                  </>
                                )}
                                {condition.type === 'Vendor-based' && (
                                  <>
                                    <SelectItem value="Vendor Name">Vendor Name</SelectItem>
                                    <SelectItem value="Vendor Type">Vendor Type</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Operator</Label>
                            <Select 
                              value={condition.operator} 
                              onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">equals</SelectItem>
                                <SelectItem value="not equals">not equals</SelectItem>
                                <SelectItem value="greater than">greater than</SelectItem>
                                <SelectItem value="less than">less than</SelectItem>
                                <SelectItem value="contains">contains</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Value</Label>
                            {condition.field === 'Current Status' || condition.field === 'Approval Status' || condition.field === 'Processing Status' ? (
                              <Select 
                                value={condition.value} 
                                onValueChange={(value) => updateCondition(condition.id, 'value', value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Processing">Processing</SelectItem>
                                  <SelectItem value="Approved">Approved</SelectItem>
                                  <SelectItem value="Rejected">Rejected</SelectItem>
                                  <SelectItem value="On Hold">On Hold</SelectItem>
                                  <SelectItem value="Exception">Exception</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder="Enter value"
                                value={condition.value}
                                onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                                className="mt-1"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsStructuredModalOpen(false)}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateStructuredRule} 
                    className="bg-violet-600 hover:bg-violet-700 px-6"
                    disabled={!newStructuredRule.name || !newStructuredRule.conditions.length}
                  >
                    Create Rule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rule Creation Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Rule Creation Mode</h3>
              <p className="text-sm text-gray-600">Choose how you want to create and view your SLA rules</p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
              <TabsList>
                <TabsTrigger value="AI-Powered">AI-Powered</TabsTrigger>
                <TabsTrigger value="Structured">Structured</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Rules Section */}
      {activeTab === 'AI-Powered' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <CardTitle>AI-Powered Rules</CardTitle>
            </div>
            <p className="text-sm text-gray-600">Rules created using natural language that are interpreted by AI in real-time</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getStatusColor(rule.status)}>
                          {rule.status}
                        </Badge>
                        <Badge className={getPriorityColor(rule.priority)}>
                          {rule.priority}
                        </Badge>
                        {rule.aiProcessed && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI Processed
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">Created {rule.created}</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium text-sm">Natural Language Rule:</h4>
                          </div>
                          <div className="bg-gray-50 p-3 rounded border-l-4 border-l-blue-500 italic text-sm">
                            "{rule.naturalLanguageRule}"
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisableRule(rule.id)}
                        disabled={rule.status === 'Inactive'}
                      >
                        {rule.status === 'Active' ? 'Disable' : 'Disabled'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {rules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No SLA rules configured yet.</p>
                <p className="text-sm">Click "AI-Powered Rule" to create your first rule.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Structured Rules Section */}
      {activeTab === 'Structured' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-600 rounded-full"></div>
              <CardTitle>Structured Rules</CardTitle>
            </div>
            <p className="text-sm text-gray-600">Rules created using structured form fields and predefined conditions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {structuredRules.map((rule) => (
              <Card key={rule.id} className="border-l-4 border-l-violet-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-lg">{rule.name}</h3>
                        <Badge className={getStatusColor(rule.status)}>
                          {rule.status}
                        </Badge>
                        <Badge className={getPriorityColor(rule.priority)}>
                          {rule.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{rule.description}</p>
                      
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Condition:</span> {rule.condition} &nbsp;&nbsp;
                        <span className="font-medium">Threshold:</span> {rule.threshold} {rule.unit}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisableStructuredRule(rule.id)}
                        disabled={rule.status === 'Inactive'}
                      >
                        {rule.status === 'Active' ? 'Disable' : 'Disabled'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {structuredRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No structured rules configured yet.</p>
                <p className="text-sm">Click "Structured Rule" to create your first rule.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 