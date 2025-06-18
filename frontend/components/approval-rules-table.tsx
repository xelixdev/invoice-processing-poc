'use client'

import { useState, useEffect } from 'react'
import { type ApprovalRule, type RuleStatus } from '@/lib/mock-approval-rules'
import { MoreVertical, Edit, Trash2, Copy, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Backend API interfaces
interface BackendAssignmentRule {
  id: number
  name: string
  rule: string
  function_assignees: string
  user_ruleset: string
  is_active: boolean
  priority: number
  created_by: number | null
  created_by_name: string
  created_by_username: string
  created_at: string
  updated_at: string
  rule_users: Array<{
    id: number
    user: {
      id: number
      username: string
      full_name: string
      department: string
      email: string
      is_active: boolean
    }
    priority: number
    created_at: string
  }>
}

// Transform backend data to frontend format
function transformBackendRule(backendRule: BackendAssignmentRule): ApprovalRule {
  return {
    id: backendRule.id.toString(),
    name: backendRule.name,
    description: backendRule.rule, // Using rule field as description
    priority: backendRule.priority,
    status: backendRule.is_active ? 'active' : 'inactive',
    createdBy: backendRule.created_by_name || backendRule.created_by_username || 'Unknown',
    createdDate: new Date(backendRule.created_at).toISOString().split('T')[0],
    lastModified: new Date(backendRule.updated_at).toISOString().split('T')[0],
    invoicesProcessed: Math.floor(Math.random() * 300), // Placeholder since backend doesn't have this
    conditions: {
      department: [backendRule.function_assignees]
    },
    approvers: {
      primary: backendRule.rule_users.map(ru => ru.user.full_name || ru.user.username)
    }
  }
}

interface ApprovalRulesTableProps {
  searchQuery: string
  onEditRule?: (rule: ApprovalRule) => void
  refreshTrigger?: number
}

function SortableRow({ rule, children }: { rule: ApprovalRule; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="hover:bg-gray-50"
    >
      {children}
    </tr>
  )
}

export default function ApprovalRulesTable({ searchQuery, onEditRule, refreshTrigger }: ApprovalRulesTableProps) {
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
    fetchRules()
  }, [])

  // Refresh rules when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchRules()
    }
  }, [refreshTrigger])
  
  const fetchRules = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/assignment-rules')
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status}`)
      }
      
      const data = await response.json()
      const transformedRules = data.results.map(transformBackendRule)
      setRules(transformedRules)
    } catch (error) {
      console.error('Error fetching rules:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch rules')
    } finally {
      setLoading(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: RuleStatus) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const handleToggleStatus = async (ruleId: string) => {
    try {
      const rule = rules.find(r => r.id === ruleId)
      if (!rule) return

      const newStatus = rule.status === 'active' ? 'inactive' : 'active'
      
      // Update locally first for immediate feedback
      setRules(rules.map(r => 
        r.id === ruleId ? { ...r, status: newStatus } : r
      ))

      // Update on backend
      const response = await fetch('/api/assignment-rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: parseInt(ruleId),
          is_active: newStatus === 'active'
        }),
      })

      if (!response.ok) {
        // Revert on error
        setRules(rules.map(r => 
          r.id === ruleId ? { ...r, status: rule.status } : r
        ))
        throw new Error('Failed to update rule status')
      }
    } catch (error) {
      console.error('Error toggling rule status:', error)
      // Could show a toast notification here
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = rules.findIndex((item) => item.id === active.id)
      const newIndex = rules.findIndex((item) => item.id === over?.id)
        
      const reorderedItems = arrayMove(rules, oldIndex, newIndex)
        
      // Update priorities after reordering
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        priority: index + 1
      }))
      
      setRules(updatedItems)

      // TODO: Update priorities on backend
      // This would require a batch update endpoint or individual updates
    }
  }

  if (!isMounted) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading assignment rules...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error loading rules</div>
            <div className="text-gray-500 text-sm">{error}</div>
            <Button 
              onClick={fetchRules} 
              variant="outline" 
              size="sm" 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices Processed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <SortableContext
                items={filteredRules.map(r => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredRules.map((rule) => (
                  <SortableRow key={rule.id} rule={rule}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="cursor-grab hover:bg-gray-100 rounded p-1 mr-2">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </div>
                        #{rule.priority}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(rule.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">{rule.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.invoicesProcessed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(rule.lastModified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.createdBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Switch
                        checked={rule.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(rule.id)}
                        disabled={false}
                        className="data-[state=checked]:bg-violet-600 scale-75"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit rule"
                          onClick={() => onEditRule?.(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </SortableRow>
                ))}
              </SortableContext>
            </tbody>
          </table>
          
          {filteredRules.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">No assignment rules found</div>
              {searchQuery && (
                <div className="text-sm text-gray-400">
                  Try adjusting your search criteria
                </div>
              )}
            </div>
          )}
        </DndContext>
      </div>
    </div>
  )
}