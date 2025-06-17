'use client'

import { useState } from 'react'
import { mockApprovalRules, type ApprovalRule, type RuleStatus } from '@/lib/mock-approval-rules'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ApprovalRulesTableProps {
  searchQuery: string
  onEditRule?: (rule: ApprovalRule) => void
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
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center">
          <button
            className="cursor-grab hover:bg-gray-100 rounded p-1 mr-2"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </button>
          #{rule.priority}
        </div>
      </td>
      {children}
    </tr>
  )
}

export default function ApprovalRulesTable({ searchQuery, onEditRule }: ApprovalRulesTableProps) {
  const [rules, setRules] = useState<ApprovalRule[]>(mockApprovalRules)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter rules based on search query
  const filteredRules = rules.filter(rule => {
    const query = searchQuery.toLowerCase()
    return (
      rule.name.toLowerCase().includes(query) ||
      rule.description.toLowerCase().includes(query) ||
      rule.createdBy.toLowerCase().includes(query) ||
      rule.status.toLowerCase().includes(query)
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const getStatusBadge = (status: RuleStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const handleToggleStatus = (ruleId: string) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          status: rule.status === 'active' ? 'inactive' : 'active'
        }
      }
      return rule
    }))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setRules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex)
        
        // Update priorities after reordering
        return reorderedItems.map((item, index) => ({
          ...item,
          priority: index + 1
        }))
      })
    }
  }

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
                  {rule.status === 'draft' ? (
                    <TooltipProvider delayDuration={500}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={rule.status === 'active'}
                              onCheckedChange={() => handleToggleStatus(rule.id)}
                              disabled={true}
                              className="data-[state=checked]:bg-violet-600 scale-75"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Draft rules must be completed before they can be activated</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Switch
                      checked={rule.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(rule.id)}
                      disabled={false}
                      className="data-[state=checked]:bg-violet-600 scale-75"
                    />
                  )}
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
        </DndContext>
      </div>
    </div>
  )
}