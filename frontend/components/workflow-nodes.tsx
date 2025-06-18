'use client'

import { Handle, Position } from 'reactflow'
import { Zap, Filter, Send, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BaseNodeProps {
  data: {
    label: string
    type: string
    onDelete?: (id: string) => void
    id?: string
  }
  selected?: boolean
}

// Trigger Node - Only has output handle
export function TriggerNode({ data, selected }: BaseNodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 min-w-[200px] relative group ${
      selected ? 'border-blue-500' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-md mr-3">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{data.label}</div>
            <div className="text-xs text-gray-500">Trigger</div>
          </div>
        </div>
        
        {data.onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => data.onDelete?.(data.id!)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          left: '50%', 
          bottom: '-8px',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
          border: '2px solid white',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

// Condition Node - Has both input and output handles
export function ConditionNode({ data, selected }: BaseNodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 min-w-[200px] relative group ${
      selected ? 'border-green-500' : 'border-gray-200'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          left: '50%', 
          top: '-8px',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
          border: '2px solid white',
          borderRadius: '50%',
        }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-md mr-3">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{data.label}</div>
            <div className="text-xs text-gray-500">Condition</div>
          </div>
        </div>
        
        {data.onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => data.onDelete?.(data.id!)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          left: '50%', 
          bottom: '-8px',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
          border: '2px solid white',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

// Action Node - Only has input handle
export function ActionNode({ data, selected }: BaseNodeProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'approve':
        return CheckCircle
      default:
        return Send
    }
  }

  const ActionIcon = getActionIcon(data.type)

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 min-w-[200px] relative group ${
      selected ? 'border-purple-500' : 'border-gray-200'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          left: '50%', 
          top: '-8px',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
          border: '2px solid white',
          borderRadius: '50%',
        }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-md mr-3">
            <ActionIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{data.label}</div>
            <div className="text-xs text-gray-500">Action</div>
          </div>
        </div>
        
        {data.onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={() => data.onDelete?.(data.id!)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Node type mapping for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
}