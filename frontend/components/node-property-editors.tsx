'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Zap, Filter, Send, CheckCircle, Users, DollarSign, Building2, Package, RotateCcw, TrendingUp, UserCheck } from 'lucide-react'
import { users, approvalTeams, User } from '@/lib/mock-organization-data'

interface NodePropertyEditorProps {
  nodeId: string
  nodeType: string
  nodeData: any
  onPropertyChange: (nodeId: string, property: string, value: any) => void
}

export function TriggerPropertyEditor({ nodeId, nodeData, onPropertyChange }: NodePropertyEditorProps) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-500 rounded-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Trigger Configuration</CardTitle>
            <CardDescription className="text-xs">When this rule should activate</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="trigger-name" className="text-xs font-medium">Trigger Name</Label>
          <Input
            id="trigger-name"
            value={nodeData.label || ''}
            onChange={(e) => onPropertyChange(nodeId, 'label', e.target.value)}
            placeholder="e.g., Invoice Received"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="trigger-event" className="text-xs font-medium">Event Type</Label>
          <Select
            value={nodeData.eventType || 'invoice-received'}
            onValueChange={(value) => onPropertyChange(nodeId, 'eventType', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice-received">Invoice Received</SelectItem>
              <SelectItem value="invoice-updated">Invoice Updated</SelectItem>
              <SelectItem value="manual-review">Manual Review Required</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="trigger-description" className="text-xs font-medium">Description</Label>
          <Textarea
            id="trigger-description"
            value={nodeData.description || ''}
            onChange={(e) => onPropertyChange(nodeId, 'description', e.target.value)}
            placeholder="Describe when this trigger activates..."
            className="mt-1 min-h-[60px]"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function ConditionPropertyEditor({ nodeId, nodeData, onPropertyChange }: NodePropertyEditorProps) {
  const conditionTypes = [
    { value: 'amount', label: 'Amount Check', icon: DollarSign },
    { value: 'department', label: 'Department Check', icon: Building2 },
    { value: 'vendor', label: 'Vendor Check', icon: Package },
    { value: 'project', label: 'Project Check', icon: Package },
  ]

  const operators = {
    amount: [
      { value: '>', label: 'Greater than' },
      { value: '<', label: 'Less than' },
      { value: '>=', label: 'Greater than or equal to' },
      { value: '<=', label: 'Less than or equal to' },
      { value: '=', label: 'Equal to' },
      { value: 'between', label: 'Between' },
    ],
    text: [
      { value: '=', label: 'Equals' },
      { value: '!=', label: 'Does not equal' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts with' },
      { value: 'ends_with', label: 'Ends with' },
    ]
  }

  const currentConditionType = nodeData.conditionType || 'amount'
  const isAmountType = currentConditionType === 'amount'

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-500 rounded-md">
            <Filter className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Condition Configuration</CardTitle>
            <CardDescription className="text-xs">Define the condition logic</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="condition-name" className="text-xs font-medium">Condition Name</Label>
          <Input
            id="condition-name"
            value={nodeData.label || ''}
            onChange={(e) => onPropertyChange(nodeId, 'label', e.target.value)}
            placeholder="e.g., High Value Check"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="condition-type" className="text-xs font-medium">Field to Check</Label>
          <Select
            value={currentConditionType}
            onValueChange={(value) => onPropertyChange(nodeId, 'conditionType', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conditionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    <type.icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="condition-operator" className="text-xs font-medium">Operator</Label>
          <Select
            value={nodeData.operator || '>'}
            onValueChange={(value) => onPropertyChange(nodeId, 'operator', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(isAmountType ? operators.amount : operators.text).map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="condition-value" className="text-xs font-medium">
            {isAmountType ? 'Amount' : 'Value'}
          </Label>
          <Input
            id="condition-value"
            type={isAmountType ? 'number' : 'text'}
            value={nodeData.value || ''}
            onChange={(e) => onPropertyChange(nodeId, 'value', e.target.value)}
            placeholder={isAmountType ? '10000' : 'Marketing'}
            className="mt-1"
          />
          {isAmountType && (
            <p className="text-xs text-gray-500 mt-1">Enter amount in dollars (no currency symbol)</p>
          )}
        </div>

        {nodeData.operator === 'between' && (
          <div>
            <Label htmlFor="condition-value-max" className="text-xs font-medium">Maximum Amount</Label>
            <Input
              id="condition-value-max"
              type="number"
              value={nodeData.valueMax || ''}
              onChange={(e) => onPropertyChange(nodeId, 'valueMax', e.target.value)}
              placeholder="50000"
              className="mt-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ActionPropertyEditor({ nodeId, nodeData, onPropertyChange }: NodePropertyEditorProps) {
  const actionTypes = [
    { value: 'route-to-user', label: 'Route to Specific User', icon: Users },
    { value: 'dynamic-assignment', label: 'Dynamic Assignment', icon: UserCheck },
    { value: 'send-notification', label: 'Send Notification', icon: Send },
    { value: 'approve', label: 'Auto Approve', icon: CheckCircle },
  ]

  const dynamicStrategies = [
    { value: 'manager-lookup', label: 'Manager Lookup', icon: UserCheck, description: 'Auto-find requester\'s manager' },
    { value: 'round-robin', label: 'Round Robin', icon: RotateCcw, description: 'Cycle through team members' },
    { value: 'load-balance', label: 'Load Balance', icon: TrendingUp, description: 'Assign to least busy person' },
    { value: 'hierarchical', label: 'Hierarchical', icon: Building2, description: 'Based on approval limits' },
    { value: 'department-head', label: 'Department Head', icon: Building2, description: 'Route to department head' },
  ]

  const currentActionType = nodeData.actionType || 'route-to-user'
  const currentStrategy = nodeData.dynamicStrategy || 'manager-lookup'

  // Get available users for display
  const availableUsers = users.filter(user => user.isAvailable)
  const busyUsers = users.filter(user => user.currentWorkload >= user.maxWorkload * 0.8)

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-500 rounded-md">
            <Send className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Action Configuration</CardTitle>
            <CardDescription className="text-xs">What should happen when conditions are met</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="action-name" className="text-xs font-medium">Action Name</Label>
          <Input
            id="action-name"
            value={nodeData.label || ''}
            onChange={(e) => onPropertyChange(nodeId, 'label', e.target.value)}
            placeholder="e.g., Route to CFO"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="action-type" className="text-xs font-medium">Action Type</Label>
          <Select
            value={currentActionType}
            onValueChange={(value) => onPropertyChange(nodeId, 'actionType', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    <type.icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Assignment Strategy */}
        {currentActionType === 'dynamic-assignment' && (
          <div>
            <Label htmlFor="dynamic-strategy" className="text-xs font-medium">Assignment Strategy</Label>
            <Select
              value={currentStrategy}
              onValueChange={(value) => onPropertyChange(nodeId, 'dynamicStrategy', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dynamicStrategies.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    <div className="flex items-center space-x-2">
                      <strategy.icon className="h-4 w-4" />
                      <div>
                        <div>{strategy.label}</div>
                        <div className="text-xs text-gray-500">{strategy.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Strategy-specific options */}
            {(currentStrategy === 'round-robin' || currentStrategy === 'load-balance') && (
              <div className="mt-2">
                <Label htmlFor="approval-team" className="text-xs font-medium">Approval Team</Label>
                <Select
                  value={nodeData.approvalTeam || ''}
                  onValueChange={(value) => onPropertyChange(nodeId, 'approvalTeam', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div>
                          <div>{team.name}</div>
                          <div className="text-xs text-gray-500">{team.members.length} members</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentStrategy === 'department-head' && (
              <div className="mt-2">
                <Label htmlFor="target-department" className="text-xs font-medium">Department</Label>
                <Select
                  value={nodeData.targetDepartment || ''}
                  onValueChange={(value) => onPropertyChange(nodeId, 'targetDepartment', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Static User Assignment */}
        {currentActionType === 'route-to-user' && (
          <div>
            <Label htmlFor="action-target" className="text-xs font-medium">Route to User</Label>
            <Select
              value={nodeData.target || ''}
              onValueChange={(value) => onPropertyChange(nodeId, 'target', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span>{user.avatar}</span>
                          <span>{user.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">{user.title}</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {!user.isAvailable && <Badge variant="destructive" className="text-xs">Unavailable</Badge>}
                        {user.currentWorkload >= user.maxWorkload * 0.8 && user.isAvailable && (
                          <Badge variant="secondary" className="text-xs">Busy</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {user.currentWorkload}/{user.maxWorkload}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notification Options */}
        {currentActionType === 'send-notification' && (
          <>
            <div>
              <Label htmlFor="notification-target" className="text-xs font-medium">Notify</Label>
              <Select
                value={nodeData.target || ''}
                onValueChange={(value) => onPropertyChange(nodeId, 'target', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <span>{user.avatar}</span>
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notification-message" className="text-xs font-medium">Message</Label>
              <Textarea
                id="notification-message"
                value={nodeData.message || ''}
                onChange={(e) => onPropertyChange(nodeId, 'message', e.target.value)}
                placeholder="Custom notification message..."
                className="mt-1 min-h-[60px]"
              />
            </div>
          </>
        )}

        {/* Auto Approve Options */}
        {currentActionType === 'approve' && (
          <div>
            <Label htmlFor="auto-approve-reason" className="text-xs font-medium">Approval Reason</Label>
            <Input
              id="auto-approve-reason"
              value={nodeData.reason || ''}
              onChange={(e) => onPropertyChange(nodeId, 'reason', e.target.value)}
              placeholder="e.g., Low value, trusted vendor"
              className="mt-1"
            />
          </div>
        )}

        <Separator />
        
        {/* Priority and Settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="action-priority" className="text-xs font-medium">Priority</Label>
            <Select
              value={nodeData.priority || 'medium'}
              onValueChange={(value) => onPropertyChange(nodeId, 'priority', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(currentActionType === 'route-to-user' || currentActionType === 'dynamic-assignment') && (
            <div>
              <Label htmlFor="escalation-time" className="text-xs font-medium">Escalation (hours)</Label>
              <Input
                id="escalation-time"
                type="number"
                value={nodeData.escalationTime || '24'}
                onChange={(e) => onPropertyChange(nodeId, 'escalationTime', e.target.value)}
                placeholder="24"
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Workload Info */}
        {(currentActionType === 'route-to-user' || currentActionType === 'dynamic-assignment') && (
          <div className="mt-3 p-3 bg-white rounded border">
            <div className="text-xs font-medium text-gray-700 mb-2">Current Workload Status</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Available approvers:</span>
                <span className="font-medium">{availableUsers.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Busy approvers:</span>
                <span className="font-medium text-amber-600">{busyUsers.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Total pending approvals:</span>
                <span className="font-medium">{users.reduce((sum, u) => sum + u.currentWorkload, 0)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function NodePropertyEditor({ selectedNode, onPropertyChange }: { 
  selectedNode: any, 
  onPropertyChange: (nodeId: string, property: string, value: any) => void 
}) {
  if (!selectedNode) {
    return (
      <div className="p-6 text-center">
        <Filter className="h-8 w-8 mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-500">Select a component to configure its properties</p>
      </div>
    )
  }

  const nodeType = selectedNode.type
  const nodeId = selectedNode.id
  const nodeData = selectedNode.data

  switch (nodeType) {
    case 'trigger':
      return <TriggerPropertyEditor nodeId={nodeId} nodeType={nodeType} nodeData={nodeData} onPropertyChange={onPropertyChange} />
    case 'condition':
      return <ConditionPropertyEditor nodeId={nodeId} nodeType={nodeType} nodeData={nodeData} onPropertyChange={onPropertyChange} />
    case 'action':
      return <ActionPropertyEditor nodeId={nodeId} nodeType={nodeType} nodeData={nodeData} onPropertyChange={onPropertyChange} />
    default:
      return (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500">Unknown node type: {nodeType}</p>
        </div>
      )
  }
}