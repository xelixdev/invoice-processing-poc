'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  DollarSign, 
  Truck, 
  Clock, 
  FileText, 
  Shield, 
  Eye, 
  AlertCircle 
} from 'lucide-react'

export interface ValidationBadge {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  category: 'financial' | 'process' | 'risk'
  label: string
  description: string
  icon: React.ReactNode
  clickable?: boolean
}

interface SmartValidationBadgesProps {
  badges: ValidationBadge[]
  onBadgeClick?: (badge: ValidationBadge) => void
}

const getBadgeStyles = (type: ValidationBadge['type']) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-100/50 text-emerald-800 hover:bg-emerald-100/70'
    case 'warning':
      return 'bg-amber-200/50 text-amber-800 hover:bg-amber-200/70'
    case 'info':
      return 'bg-blue-100/50 text-blue-800 hover:bg-blue-100/70'
    case 'error':
      return 'bg-red-100/50 text-red-800 hover:bg-red-100/70'
    default:
      return 'bg-slate-100/50 text-slate-800 hover:bg-slate-100/70'
  }
}

export default function SmartValidationBadges({ badges, onBadgeClick }: SmartValidationBadgesProps) {
  if (!badges || badges.length === 0) return null

  // Group badges by type for better organization
  const successBadges = badges.filter(b => b.type === 'success')
  const warningBadges = badges.filter(b => b.type === 'warning')
  const errorBadges = badges.filter(b => b.type === 'error')
  const infoBadges = badges.filter(b => b.type === 'info')
  
  const orderedBadges = [...errorBadges, ...warningBadges, ...infoBadges, ...successBadges]

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-slate-700">Validation</span>
        <span className="text-xs text-slate-500">(2)</span>
      </div>
      
      <TooltipProvider>
        <div className="flex flex-wrap gap-1.5">
          {orderedBadges.map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    transition-all duration-200
                    ${getBadgeStyles(badge.type)}
                    ${badge.clickable ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'}
                  `}
                  onClick={() => badge.clickable && onBadgeClick?.(badge)}
                >
                  <span className="w-3 h-3 flex-shrink-0">
                    {badge.icon}
                  </span>
                  <span className="truncate max-w-[140px]">
                    {badge.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="max-w-sm z-[60]" 
                sideOffset={8}
                collisionPadding={16}
              >
                <div className="space-y-1">
                  <p className="font-medium text-xs">{badge.label}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}

// Utility function to generate validation badges based on invoice data
export function generateValidationBadges(invoice: any, purchaseOrder?: any, goodsReceipt?: any): ValidationBadge[] {
  const badges: ValidationBadge[] = []

  // Financial Validation Badges
  if (purchaseOrder) {
    const amountDiff = invoice.totalAmount - purchaseOrder.amount
    const percentDiff = Math.abs((amountDiff / purchaseOrder.amount) * 100)
    
    if (percentDiff <= 5) {
      badges.push({
        id: 'po-match',
        type: 'success',
        category: 'financial',
        label: 'PO Match Confirmed',
        description: `Invoice amount matches PO within 5% tolerance (${percentDiff.toFixed(1)}% difference)`,
        icon: <CheckCircle className="w-3 h-3" />
      })
    } else {
      badges.push({
        id: 'amount-variance',
        type: 'warning',
        category: 'financial',
        label: `Amount Variance (${amountDiff > 0 ? '+' : ''}${percentDiff.toFixed(0)}%)`,
        description: `Invoice amount differs from PO by ${percentDiff.toFixed(1)}% (${amountDiff > 0 ? '+' : ''}$${Math.abs(amountDiff).toLocaleString()})`,
        icon: <AlertTriangle className="w-3 h-3" />
      })
    }
  }

  // Budget Impact Badge  
  const budgetRemaining = 35 // Mock remaining budget percentage (deterministic)
  badges.push({
    id: 'budget-impact',
    type: budgetRemaining > 25 ? 'info' : budgetRemaining > 10 ? 'warning' : 'error',
    category: 'financial',
    label: `Budget Impact (${budgetRemaining.toFixed(0)}% remaining)`,
    description: `Approving this invoice will leave ${budgetRemaining.toFixed(0)}% of department budget remaining`,
    icon: <BarChart3 className="w-3 h-3" />
  })

  // Approval Limit Badge
  const approvalLimit = 10000 // Mock user approval limit
  if (invoice.totalAmount <= approvalLimit) {
    badges.push({
      id: 'approval-limit',
      type: 'success',
      category: 'financial',
      label: 'Within Approval Limit',
      description: `Invoice amount ($${invoice.totalAmount.toLocaleString()}) is within your approval limit ($${approvalLimit.toLocaleString()})`,
      icon: <DollarSign className="w-3 h-3" />
    })
  } else {
    badges.push({
      id: 'approval-limit-exceeded',
      type: 'warning',
      category: 'financial',
      label: 'Exceeds Approval Limit',
      description: `Invoice amount ($${invoice.totalAmount.toLocaleString()}) exceeds your approval limit ($${approvalLimit.toLocaleString()})`,
      icon: <AlertCircle className="w-3 h-3" />
    })
  }

  // Process Validation Badges
  if (goodsReceipt?.status === 'received') {
    badges.push({
      id: 'goods-received',
      type: 'success',
      category: 'process',
      label: 'Goods Received',
      description: `Delivery confirmed on ${goodsReceipt.receivedDate}`,
      icon: <Truck className="w-3 h-3" />
    })
  } else {
    badges.push({
      id: 'pending-receipt',
      type: 'warning',
      category: 'process',
      label: 'Pending Receipt',
      description: 'Awaiting delivery confirmation from receiving department',
      icon: <Clock className="w-3 h-3" />
    })
  }

  // Documentation Badge
  const hasRequiredDocs = invoice.attachments && invoice.attachments.length > 0
  if (hasRequiredDocs) {
    badges.push({
      id: 'docs-complete',
      type: 'success',
      category: 'process',
      label: 'Documentation Complete',
      description: 'All required attachments are present',
      icon: <FileText className="w-3 h-3" />
    })
  } else {
    badges.push({
      id: 'missing-docs',
      type: 'warning',
      category: 'process',
      label: 'Missing Documentation',
      description: 'Some required documents may be missing',
      icon: <AlertTriangle className="w-3 h-3" />
    })
  }

  // Risk Assessment Badges
  const vendorRisk = 0.55 // Mock vendor risk calculation (deterministic)
  if (vendorRisk < 0.3) {
    badges.push({
      id: 'trusted-vendor',
      type: 'success',
      category: 'risk',
      label: 'Trusted Vendor',
      description: 'Vendor has excellent payment history and low risk profile',
      icon: <Shield className="w-3 h-3" />
    })
  } else if (vendorRisk < 0.7) {
    badges.push({
      id: 'vendor-address-mismatch',
      type: 'warning',
      category: 'risk',
      label: 'Vendor Address Changed',
      description: 'Vendor address differs from our records. Verification recommended before payment.',
      icon: <AlertTriangle className="w-3 h-3" />
    })
  } else {
    badges.push({
      id: 'high-risk-vendor',
      type: 'error',
      category: 'risk',
      label: 'High Risk Vendor',
      description: 'Vendor has payment issues or compliance concerns',
      icon: <AlertCircle className="w-3 h-3" />
    })
  }

  // Duplicate Detection Badge (mock logic)
  const duplicateRisk = 0.15 // Mock duplicate risk (deterministic)
  if (duplicateRisk > 0.8) {
    badges.push({
      id: 'duplicate-risk',
      type: 'error',
      category: 'risk',
      label: `Duplicate Risk (${Math.floor(duplicateRisk * 100)}% match)`,
      description: 'Similar invoice amount and vendor detected within the last 7 days',
      icon: <AlertTriangle className="w-3 h-3" />
    })
  }

  return badges
}