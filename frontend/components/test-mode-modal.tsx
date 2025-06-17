'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RuleTesting } from './rule-testing'
import { Node, Edge } from 'reactflow'

interface TestModeModalProps {
  isOpen: boolean
  onClose: () => void
  nodes: Node[]
  edges: Edge[]
  ruleName: string
  onExecutionPathUpdate?: (path: any[]) => void
}

export default function TestModeModal({ 
  isOpen, 
  onClose, 
  nodes, 
  edges, 
  ruleName,
  onExecutionPathUpdate 
}: TestModeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Test Rule: {ruleName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Simulate rule execution with test invoice data
            </p>
          </div>
          
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <RuleTesting 
              nodes={nodes} 
              edges={edges}
              onExecutionPathUpdate={onExecutionPathUpdate}
            />
          </ScrollArea>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Test your rule with different invoice scenarios to ensure it works correctly
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}