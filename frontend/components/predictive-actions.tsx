'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  CheckCircle, 
  Zap, 
  Phone, 
  Users, 
  FileQuestion, 
  Pause, 
  Eye, 
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react'

export interface PredictiveAction {
  id: string
  type: 'primary' | 'secondary' | 'info'
  category: 'approve' | 'investigate' | 'delegate' | 'contact' | 'hold'
  label: string
  description: string
  icon: React.ReactNode
  confidence: number // 0-100
  reasoning: string[]
  action: () => void
  urgent?: boolean
}

interface PredictiveActionsProps {
  actions: PredictiveAction[]
  onActionClick?: (action: PredictiveAction) => void
}

const getActionStyles = (type: PredictiveAction['type'], urgent?: boolean, actionCategory?: string) => {
  const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-1'
  
  // All buttons now use consistent purple outline design
  if (urgent) {
    return `${baseClasses} bg-violet-25 hover:bg-violet-50 text-violet-800 border-violet-300 hover:border-violet-400 focus:ring-violet-500/20`
  }
  
  switch (type) {
    case 'primary':
      return `${baseClasses} bg-violet-25 hover:bg-violet-50 text-violet-800 border-violet-300 hover:border-violet-400 focus:ring-violet-500/20`
    case 'secondary':
      return `${baseClasses} bg-violet-25 hover:bg-violet-50 text-violet-700 border-violet-300 hover:border-violet-400 focus:ring-violet-500/20`
    case 'info':
      return `${baseClasses} bg-violet-25 hover:bg-violet-50 text-violet-600 border-violet-300 hover:border-violet-400 focus:ring-violet-500/20`
    default:
      return `${baseClasses} bg-violet-25 hover:bg-violet-50 text-violet-600 border-violet-300 hover:border-violet-400 focus:ring-violet-500/20`
  }
}


export default function PredictiveActions({ actions, onActionClick }: PredictiveActionsProps) {
  if (!actions || actions.length === 0) return null

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-slate-700">AI Recommendations</span>
      </div>
      
      <div>
        <TooltipProvider>
          <div className="space-y-2">
            {Array.from({ length: Math.ceil(actions.length / 2) }, (_, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={getActionStyles(actions[rowIndex * 2].type, actions[rowIndex * 2].urgent, actions[rowIndex * 2].category)}
                      onClick={() => {
                        actions[rowIndex * 2].action()
                        onActionClick?.(actions[rowIndex * 2])
                      }}
                    >
                      <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                        {actions[rowIndex * 2].icon}
                      </span>
                      <span className="truncate text-xs">{actions[rowIndex * 2].label}</span>
                      {actions[rowIndex * 2].urgent && <AlertTriangle className="w-3 h-3 flex-shrink-0 text-violet-500" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="max-w-sm z-[60]" 
                    sideOffset={8}
                    collisionPadding={16}
                  >
                    <div className="space-y-2">
                      <p className="font-medium text-xs">{actions[rowIndex * 2].label}</p>
                      <p className="text-xs text-muted-foreground">{actions[rowIndex * 2].description}</p>
                      <div className="text-xs">
                        <div className="font-medium mb-1 text-slate-700">Why AI suggests this:</div>
                        <ul className="space-y-0.5 text-slate-600">
                          {actions[rowIndex * 2].reasoning.slice(0, 3).map((reason, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                {actions[rowIndex * 2 + 1] && (
                  <>
                    <span className="text-xs text-slate-400">or</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={getActionStyles(actions[rowIndex * 2 + 1].type, actions[rowIndex * 2 + 1].urgent, actions[rowIndex * 2 + 1].category)}
                          onClick={() => {
                            actions[rowIndex * 2 + 1].action()
                            onActionClick?.(actions[rowIndex * 2 + 1])
                          }}
                        >
                          <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                            {actions[rowIndex * 2 + 1].icon}
                          </span>
                          <span className="truncate text-xs">{actions[rowIndex * 2 + 1].label}</span>
                          {actions[rowIndex * 2 + 1].urgent && <AlertTriangle className="w-3 h-3 flex-shrink-0 text-violet-500" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom" 
                        className="max-w-sm z-[60]" 
                        sideOffset={8}
                        collisionPadding={16}
                      >
                        <div className="space-y-2">
                          <p className="font-medium text-xs">{actions[rowIndex * 2 + 1].label}</p>
                          <p className="text-xs text-muted-foreground">{actions[rowIndex * 2 + 1].description}</p>
                          <div className="text-xs">
                            <div className="font-medium mb-1 text-slate-700">Why AI suggests this:</div>
                            <ul className="space-y-0.5 text-slate-600">
                              {actions[rowIndex * 2 + 1].reasoning.slice(0, 3).map((reason, index) => (
                                <li key={index} className="flex items-start gap-1">
                                  <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}

// Utility function to generate predictive actions based on invoice data and validation results
export function generatePredictiveActions(
  invoice: any, 
  validationBadges: any[], 
  currentUser: any,
  onApprove?: () => void,
  onReject?: () => void,
  onDelegate?: (userId: string) => void,
  onHold?: () => void,
  onContactVendor?: () => void
): PredictiveAction[] {
  const actions: PredictiveAction[] = []

  // Count validation issues
  const errors = validationBadges.filter(b => b.type === 'error').length
  const warnings = validationBadges.filter(b => b.type === 'warning').length
  const successes = validationBadges.filter(b => b.type === 'success').length

  // Calculate overall confidence
  const totalValidations = errors + warnings + successes
  const confidenceScore = totalValidations > 0 
    ? Math.max(10, Math.min(95, ((successes * 2 - errors * 2 - warnings) / totalValidations) * 50 + 50))
    : 75

  // Determine if invoice is overdue or urgent
  const dueDate = new Date(invoice.dueDate)
  const now = new Date()
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntilDue < 0
  const isUrgent = daysUntilDue <= 2

  // Smart Approve (Consolidated approval action)
  if (errors === 0 && warnings <= 1 && confidenceScore >= 75) {
    const isQuickApprove = errors === 0 && warnings === 0 && confidenceScore >= 90 && invoice.totalAmount < 5000
    
    actions.push({
      id: 'smart-approve',
      type: 'primary',
      category: 'approve',
      label: isQuickApprove ? 'Quick Approve' : (warnings === 0 ? 'Approve' : 'Approve with Caution'),
      description: isQuickApprove 
        ? 'Low-risk, routine transaction. Safe for immediate approval.'
        : 'All critical validations passed. This invoice appears safe to approve.',
      icon: isQuickApprove ? <Zap className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />,
      confidence: Math.round(confidenceScore),
      reasoning: isQuickApprove ? [
        'All validations passed with no issues',
        'Amount below risk threshold ($5,000)',
        'Trusted vendor with good history',
        'Routine transaction - can be processed immediately'
      ] : [
        `${successes} validation checks passed`,
        warnings === 0 ? 'No warnings detected' : `${warnings} minor warning(s) noted`,
        'Invoice matches typical patterns for this vendor',
        confidenceScore >= 85 ? 'High confidence in approval recommendation' : 'Moderate confidence in approval recommendation'
      ],
      action: onApprove || (() => {}),
      urgent: isOverdue && isQuickApprove
    })
  }

  // Delegate (Amount exceeds approval limit)
  const approvalLimit = 10000 // Mock user approval limit
  if (invoice.totalAmount > approvalLimit) {
    actions.push({
      id: 'delegate-amount',
      type: 'secondary',
      category: 'delegate',
      label: 'Delegate to Manager',
      description: `Invoice amount exceeds your approval limit. Suggest delegating to manager.`,
      icon: <Users className="w-3 h-3" />,
      confidence: 95,
      reasoning: [
        `Amount ($${invoice.totalAmount.toLocaleString()}) exceeds your limit ($${approvalLimit.toLocaleString()})`,
        'Sarah Chen has authority for this amount',
        'Typical processing time: 1-2 business days',
        'Maintains proper approval hierarchy'
      ],
      action: () => onDelegate?.('sarah-chen-001'),
      urgent: isOverdue
    })
  }

  // Contact Vendor (Always available for vendor communication)
  const hasSignificantIssues = errors > 0 || warnings > 2
  
  actions.push({
    id: 'contact-vendor',
    type: hasSignificantIssues ? 'primary' : 'secondary',
    category: 'contact',
    label: 'Contact Vendor',
    description: errors > 0 || warnings > 1 
      ? 'Discrepancies detected. Send AI-generated inquiry to vendor for clarification.'
      : 'Send vendor inquiry about this invoice using AI-drafted email.',
    icon: <MessageSquare className="w-3 h-3" />,
    confidence: 85,
    reasoning: errors > 0 || warnings > 1 ? [
      `${errors + warnings} validation issues detected`,
      'AI-generated email with specific questions',
      'Professional vendor communication',
      'Maintains good vendor relationships'
    ] : [
      'Proactive vendor communication available',
      'AI drafts professional inquiry email',
      'Quick clarification for peace of mind',
      'Builds stronger vendor relationships'
    ],
    action: onContactVendor || (() => {}),
    urgent: false
  })

  // Request Additional Info (Missing documentation or unclear data)
  const missingDocs = validationBadges.some(b => b.id === 'missing-docs')
  if (missingDocs || warnings > 1) {
    actions.push({
      id: 'request-info',
      type: 'info',
      category: 'investigate',
      label: 'Request Additional Info',
      description: 'Request missing documentation or clarification before proceeding.',
      icon: <FileQuestion className="w-3 h-3" />,
      confidence: 75,
      reasoning: [
        missingDocs ? 'Required documentation is missing' : 'Additional clarification needed',
        'Standard process for incomplete submissions',
        'Reduces risk of processing errors',
        'Maintains audit compliance'
      ],
      action: () => {
        // Mock action to request additional info
        console.log('Requesting additional information...')
      }
    })
  }

  // Hold Pending Review (High risk or multiple issues)
  if (errors > 1 || (errors > 0 && warnings > 1)) {
    actions.push({
      id: 'hold-review',
      type: 'info',
      category: 'hold',
      label: 'Hold Pending Review',
      description: 'Multiple issues detected. Recommend holding for detailed review.',
      icon: <Pause className="w-3 h-3" />,
      confidence: 90,
      reasoning: [
        `${errors} critical issues and ${warnings} warnings detected`,
        'Multiple validation failures require investigation',
        'Risk mitigation strategy',
        'Allows time for proper resolution'
      ],
      action: onHold || (() => {}),
      urgent: false
    })
  }

  // Review Recommended (Moderate risk)
  if (errors === 0 && warnings > 2 && confidenceScore < 70) {
    actions.push({
      id: 'review-recommended',
      type: 'info',
      category: 'investigate',
      label: 'Review Recommended',
      description: 'Several warnings detected. Detailed review suggested before approval.',
      icon: <Eye className="w-3 h-3" />,
      confidence: 65,
      reasoning: [
        `${warnings} warnings require attention`,
        'Pattern differs from typical approvals',
        'Additional scrutiny recommended',
        'Confidence below optimal threshold'
      ],
      action: () => {
        // Mock action to flag for detailed review
        console.log('Flagging for detailed review...')
      }
    })
  }

  // Sort actions by confidence (highest first) and urgency
  return actions.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    return b.confidence - a.confidence
  })
}