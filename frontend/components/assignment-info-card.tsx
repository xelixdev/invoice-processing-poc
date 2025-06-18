"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"

interface AssignmentRule {
  id: number
  name: string
  description: string
  department: string
  priority: number
}

interface AssignedUser {
  id: number
  username: string
  full_name: string
  department: string
  email: string
  rule: AssignmentRule
  confidence: number
  explanation: string
}

interface AssignmentInfoCardProps {
  assignedUser: AssignedUser | null
  isLoading?: boolean
  compact?: boolean
}

const AssignmentInfoCard: React.FC<AssignmentInfoCardProps> = ({ 
  assignedUser, 
  isLoading = false,
  compact = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className={`border rounded-lg bg-white ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!assignedUser) {
    return (
      <div className={`border rounded-lg bg-gray-50 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm">?</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">No assignment information</p>
            <p className="text-xs text-gray-500">Assignment rules may not be configured</p>
          </div>
        </div>
      </div>
    )
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (confidence >= 0.7) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertCircle className="h-4 w-4 text-red-600" />
  }

  return (
    <div className={`border rounded-lg bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Simple initials avatar instead of scary icon */}
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 text-sm font-medium">
              {assignedUser.full_name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-medium ${compact ? 'text-sm' : 'text-base'} text-gray-900 truncate`}>
                Assigned to {assignedUser.full_name}
              </p>
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                {assignedUser.department}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              {getConfidenceIcon(assignedUser.confidence)}
              <span className={`text-xs ${getConfidenceColor(assignedUser.confidence)} font-medium`}>
                {Math.round(assignedUser.confidence * 100)}% confidence
              </span>
              <span className="text-xs text-gray-500">
                • Rule: {assignedUser.rule.name}
              </span>
            </div>
          </div>
        </div>

        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">AI Explanation:</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {assignedUser.explanation}
              </p>
            </div>
            
            <div className="flex items-center gap-4 pt-2">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Rule ID:</span> {assignedUser.rule.id}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium">Priority:</span> {assignedUser.rule.priority}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Reassign
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                View Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignmentInfoCard 