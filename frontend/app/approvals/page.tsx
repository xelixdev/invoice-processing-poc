'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import MainHeader from '@/components/main-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Users, Clock, CheckCircle, Calendar, Pause, AlertTriangle, ChevronDown, ChevronRight, Plus, Settings, User, UserX, RotateCcw, FileText, Inbox, PartyPopper, Sparkles, Search, Filter, ArrowRight, Forward, Receipt, Eye, CreditCard, DollarSign, MessageSquare, Send } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import SmartValidationBadges, { generateValidationBadges } from '@/components/smart-validation-badges'
import PredictiveActions, { generatePredictiveActions } from '@/components/predictive-actions'
import { AIInvoiceAnalyzer } from '@/lib/ai-invoice-insights'
import EmailComposer from '@/components/email-composer'

type ViewType = 'pending' | 'on-hold' | 'overdue' | 'approved-today' | 'rejected' | 'approved-month' | 'delegated' | 'all'

export default function ApprovalsPage() {
  const [activeView, setActiveView] = useState<ViewType>('pending')
  const [assignments, setAssignments] = useState<Record<string, typeof assigneeOptions[0]>>({})
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user')
  const [delegatedInvoices, setDelegatedInvoices] = useState<Set<string>>(new Set())
  const [delegatedDetails, setDelegatedDetails] = useState<Record<string, { delegatedTo: typeof assigneeOptions[0], dateDelegated: string, originalInvoice: any, reason: string, comment?: string }>>({})
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [highlighting, setHighlighting] = useState<Set<string>>(new Set())
  const [approvedInvoices, setApprovedInvoices] = useState<Set<string>>(new Set())
  const [rejectedInvoices, setRejectedInvoices] = useState<Set<string>>(new Set())
  const [showDelegationModal, setShowDelegationModal] = useState<{ invoiceId: string, assignee: typeof assigneeOptions[0] } | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState<{ invoiceId: string, invoiceNumber: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [delegationComment, setDelegationComment] = useState<string>('')
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>('')
  const [rejectionComment, setRejectionComment] = useState<string>('')
  const [onHoldInvoices, setOnHoldInvoices] = useState<Set<string>>(new Set())
  const [rejectionDetails, setRejectionDetails] = useState<Record<string, { reason: string, comment?: string, dateRejected: string }>>({})
  const [actionTypes, setActionTypes] = useState<Record<string, 'approve' | 'reject' | 'delegate'>>({})
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<string>('')
  const [comments] = useState([
    {
      id: 1,
      author: 'Sarah Chen',
      initials: 'SC',
      role: 'AP Manager',
      timestamp: '2 hours ago',
      content: 'The vendor information looks correct, but I need to verify the tax calculation before approval.',
      color: 'bg-violet-500'
    },
    {
      id: 2,
      author: 'Michael Johnson',
      initials: 'MJ',
      role: 'AP Specialist',
      timestamp: '1 hour ago',
      content: 'I\'ve checked the purchase order and everything matches. The delivery was confirmed last week.',
      color: 'bg-blue-500'
    },
    {
      id: 3,
      author: 'Current User',
      initials: 'JD',
      role: 'Finance Director',
      timestamp: 'Just now',
      content: 'Tax calculation verified - 17.5% VAT is correct for this supplier. Ready for approval.',
      color: 'bg-green-500'
    }
  ])
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [smartSuggestionsExpanded, setSmartSuggestionsExpanded] = useState(false)
  const [showTeamWorkloadDrawer, setShowTeamWorkloadDrawer] = useState(false)
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [teamFilterOptions, setTeamFilterOptions] = useState({
    status: 'all', // all, available, busy, out-of-office
    workloadLevel: 'all', // all, underloaded, balanced, overloaded
    slaPerformance: 'all', // all, high, medium, low
    department: 'all' // all, or specific departments
  })
  const [showBulkAssignmentDrawer, setShowBulkAssignmentDrawer] = useState(false)
  const [assignmentStrategy, setAssignmentStrategy] = useState<'direct' | 'round-robin' | 'load-balance' | 'ai-smart'>('direct')
  const [selectedAssignee, setSelectedAssignee] = useState<typeof assigneeOptions[0] | null>(null)
  const [assignmentPreview, setAssignmentPreview] = useState<Array<{invoiceId: string, assignedTo: typeof assigneeOptions[0], reason: string}>>([])
  const [bulkAssignmentSearchQuery, setBulkAssignmentSearchQuery] = useState('')
  
  const { toast } = useToast()
  
  // Current user context
  const currentUser = {
    id: 'current-user-001',
    name: 'John Doe',
    initials: 'JD',
    color: 'bg-blue-500'
  }
  
  // User options for reassignment
  const assigneeOptions = [
    { id: 'SC', initials: 'SC', name: 'Sarah Chen', role: 'AP Manager', color: 'bg-violet-500', currentWorkload: 8 },
    { id: 'MJ', initials: 'MJ', name: 'Michael Johnson', role: 'AP Specialist', color: 'bg-blue-500', currentWorkload: 5 },
    { id: 'AR', initials: 'AR', name: 'Anna Rodriguez', role: 'Finance Director', color: 'bg-green-500', currentWorkload: 3 },
    { id: 'DK', initials: 'DK', name: 'David Kim', role: 'CFO', color: 'bg-amber-500', currentWorkload: 2 },
    { id: 'LP', initials: 'LP', name: 'Lisa Park', role: 'Senior Accountant', color: 'bg-purple-500', currentWorkload: 6 },
    { id: 'JW', initials: 'JW', name: 'John Wilson', role: 'Department Head', color: 'bg-red-500', currentWorkload: 4 },
    { id: 'KB', initials: 'KB', name: 'Karen Brown', role: 'Legal Counsel', color: 'bg-indigo-500', currentWorkload: 1 }
  ]

  // Team workload data for admin view
  const teamWorkloadData = [
    {
      id: 'SC',
      name: 'Sarah Chen',
      initials: 'SC',
      role: 'AP Manager',
      color: 'bg-violet-500',
      status: 'available',
      currentWorkload: {
        pending: 8,
        inProgress: 3,
        completedToday: 5
      },
      capacity: 12,
      avgApprovalTime: 1.2, // hours
      slaCompliance: 96,
      lastActive: '2 mins ago'
    },
    {
      id: 'MJ',
      name: 'Michael Johnson',
      initials: 'MJ',
      role: 'AP Specialist',
      color: 'bg-blue-500',
      status: 'busy',
      currentWorkload: {
        pending: 11,
        inProgress: 2,
        completedToday: 4
      },
      capacity: 12,
      avgApprovalTime: 2.1,
      slaCompliance: 89,
      lastActive: '5 mins ago'
    },
    {
      id: 'AR',
      name: 'Anna Rodriguez',
      initials: 'AR',
      role: 'Finance Director',
      color: 'bg-green-500',
      status: 'available',
      currentWorkload: {
        pending: 4,
        inProgress: 1,
        completedToday: 7
      },
      capacity: 8,
      avgApprovalTime: 0.8,
      slaCompliance: 98,
      lastActive: '1 min ago'
    },
    {
      id: 'DK',
      name: 'David Kim',
      initials: 'DK',
      role: 'CFO',
      color: 'bg-amber-500',
      status: 'available',
      currentWorkload: {
        pending: 2,
        inProgress: 1,
        completedToday: 3
      },
      capacity: 6,
      avgApprovalTime: 1.5,
      slaCompliance: 94,
      lastActive: '10 mins ago'
    },
    {
      id: 'LP',
      name: 'Lisa Park',
      initials: 'LP',
      role: 'Senior Accountant',
      color: 'bg-purple-500',
      status: 'out-of-office',
      currentWorkload: {
        pending: 0,
        inProgress: 0,
        completedToday: 0
      },
      capacity: 10,
      avgApprovalTime: 1.8,
      slaCompliance: 91,
      lastActive: 'Yesterday'
    },
    {
      id: 'JW',
      name: 'John Wilson',
      initials: 'JW',
      role: 'Department Head',
      color: 'bg-red-500',
      status: 'available',
      currentWorkload: {
        pending: 6,
        inProgress: 2,
        completedToday: 2
      },
      capacity: 8,
      avgApprovalTime: 2.3,
      slaCompliance: 87,
      lastActive: '15 mins ago'
    }
  ]

  // Delegation reasons
  const delegationReasons = [
    "Vacation coverage",
    "Subject matter expertise needed",
    "Workload balancing", 
    "Higher approval authority required",
    "Conflict of interest",
    "Other..."
  ]

  // Rejection reasons
  const rejectionReasons = [
    "Missing documentation",
    "Incorrect amount",
    "Duplicate invoice",
    "Budget not approved",
    "Invalid purchase order",
    "Needs additional approval",
    "Other..."
  ]

  // Reasons that trigger "On Hold" instead of "Rejected"
  const holdReasons = [
    "Missing documentation",
    "Needs additional approval"
  ]

  // Sample invoice data (same for all invoices for prototype)
  const sampleInvoiceData = {
    invoiceNumber: 'INV-2024-001',
    vendor: 'V078 - WOODPECKER SCHOOL & OFFICE SUPPLIES',
    invoiceDate: 'January 15, 2024',
    dueDate: 'February 14, 2024',
    totalAmount: '€4,086.10',
    currency: 'EUR',
    subtotal: '€3,552.00',
    taxRate: '17.5%',
    taxAmount: '€534.10',
    paymentMethod: 'Bank Transfer',
    paymentTerms: '30 days',
    billingAddress: 'Wooding Peckering LLC, 123 High Street, Peacton, Richmond, VA, USA',
    // Enhanced fields for AI insights
    department: 'Marketing',
    businessUnit: 'North America',
    projectCode: 'MKT-Q1-2024',
    glCode: '5000-SUPPLIES',
    category: 'Office Supplies',
    requestedBy: 'Sarah Chen',
    approvalLimit: 10000,
    vendorId: 'office-supplies-inc',
    purchaseOrderNumber: 'PO-2024-0456',
    contractReference: 'MSA-2023-WOODPECKER',
    urgency: 'medium',
    lastVendorInvoiceDate: '2023-12-15',
    vendorPaymentHistory: {
      totalInvoices: 24,
      averageAmount: 3250,
      onTimeRate: 0.96,
      lastPaymentDate: '2023-12-20'
    },
    budgetInfo: {
      departmentBudget: 150000,
      spentToDate: 89500,
      categoryBudget: 25000,
      categorySpent: 18200
    },
    attachments: [
      { name: 'invoice.pdf', type: 'invoice', size: '245KB', uploadDate: '2024-01-15' },
      { name: 'receipt.pdf', type: 'receipt', size: '180KB', uploadDate: '2024-01-16' },
      { name: 'po_confirmation.pdf', type: 'purchase_order', size: '120KB', uploadDate: '2024-01-10' }
    ],
    riskFactors: {
      duplicateCheck: false,
      amountThreshold: false,
      newVendor: false,
      missingDocuments: false,
      budgetExceedance: false
    },
    lineItems: [
      { id: 1, description: 'Office Paper A4 - 500 sheets', quantity: 25, unitPrice: 12.50, amount: 312.50, glCode: '5000-SUPPLIES', category: 'Paper Products' },
      { id: 2, description: 'Blue Ink Pens - Pack of 12', quantity: 15, unitPrice: 8.75, amount: 131.25, glCode: '5000-SUPPLIES', category: 'Writing Materials' },
      { id: 3, description: 'Stapler Heavy Duty', quantity: 5, unitPrice: 24.00, amount: 120.00, glCode: '5000-SUPPLIES', category: 'Office Equipment' },
      { id: 4, description: 'Desk Organizer Set', quantity: 8, unitPrice: 45.50, amount: 364.00, glCode: '5000-SUPPLIES', category: 'Office Equipment' },
      { id: 5, description: 'Whiteboard Markers - Set of 8', quantity: 12, unitPrice: 15.25, amount: 183.00, glCode: '5000-SUPPLIES', category: 'Writing Materials' }
    ]
  }

  const handleInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
  }

  const handleCloseInvoice = () => {
    setSelectedInvoiceId(null)
  }

  // Checkbox handling functions
  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allInvoiceIds = getApprovalsList().map(invoice => invoice.id)
      setSelectedInvoices(new Set(allInvoiceIds))
    } else {
      setSelectedInvoices(new Set())
    }
  }

  const isAllSelected = () => {
    const currentInvoices = getApprovalsList()
    return currentInvoices.length > 0 && currentInvoices.every(invoice => selectedInvoices.has(invoice.id))
  }

  const isSomeSelected = () => {
    return selectedInvoices.size > 0 && !isAllSelected()
  }

  // Determine if current view supports bulk operations
  const supportsBulkOperations = () => {
    return ['pending', 'overdue', 'on-hold'].includes(activeView)
  }

  // Initialize assignments for user mode 
  const initializeAssignments = () => {
    if (userRole === 'user') {
      // In user mode, invoices start unassigned (+ icon state)
      // Only assign when explicitly delegating
      setAssignments({})
    } else {
      // In admin mode, keep existing assignments or clear them
      setAssignments({})
    }
    // Reset delegated invoices when switching roles
    setDelegatedInvoices(new Set())
    setDelegatedDetails({})
    setAnimatingOut(new Set())
    setHighlighting(new Set())
    setApprovedInvoices(new Set())
    setRejectedInvoices(new Set())
    setShowDelegationModal(null)
    setSelectedReason('')
    setDelegationComment('')
    setActionTypes({})
  }


  // Initialize assignments on component mount
  useEffect(() => {
    initializeAssignments()
  }, [userRole])

  // Filter team members based on search and filter options
  const getFilteredTeamMembers = () => {
    return teamWorkloadData
      .filter(member => {
        // Search filter
        const matchesSearch = teamSearchQuery === '' || 
          member.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
          member.role.toLowerCase().includes(teamSearchQuery.toLowerCase())
        
        // Status filter
        const matchesStatus = teamFilterOptions.status === 'all' || 
          member.status === teamFilterOptions.status
        
        // Workload level filter
        const workloadPercentage = Math.round((member.currentWorkload.pending / member.capacity) * 100)
        const matchesWorkload = teamFilterOptions.workloadLevel === 'all' || 
          (teamFilterOptions.workloadLevel === 'underloaded' && workloadPercentage < 70) ||
          (teamFilterOptions.workloadLevel === 'balanced' && workloadPercentage >= 70 && workloadPercentage < 90) ||
          (teamFilterOptions.workloadLevel === 'overloaded' && workloadPercentage >= 90)
        
        // SLA performance filter
        const matchesSLA = teamFilterOptions.slaPerformance === 'all' ||
          (teamFilterOptions.slaPerformance === 'high' && member.slaCompliance >= 95) ||
          (teamFilterOptions.slaPerformance === 'medium' && member.slaCompliance >= 85 && member.slaCompliance < 95) ||
          (teamFilterOptions.slaPerformance === 'low' && member.slaCompliance < 85)
        
        return matchesSearch && matchesStatus && matchesWorkload && matchesSLA
      })
  }

  const handleReassignInvoice = (invoiceId: string, assignee: typeof assigneeOptions[0]) => {
    // In user mode, show delegation modal for reasoning
    if (userRole === 'user' && assignee.name !== currentUser.name) {
      setShowDelegationModal({ invoiceId, assignee })
      setSelectedReason('')
      setDelegationComment('')
      return
    }
    
    // For admin mode, proceed directly
    console.log(`Assigning invoice ${invoiceId} to ${assignee.name}`)
    setAssignments(prev => ({ ...prev, [invoiceId]: assignee }))
  }

  const handleDelegateWithReason = (reason: string, comment?: string) => {
    if (!showDelegationModal) return
    
    const { invoiceId, assignee } = showDelegationModal
    
    console.log(`Delegating invoice ${invoiceId} to ${assignee.name} - Reason: ${reason}`)
    
    // First, update the assignment (this fills the pill immediately)
    setAssignments(prev => ({ ...prev, [invoiceId]: assignee }))
    
    // Step 1: Track action type and start purple highlight immediately
    setActionTypes(prev => ({ ...prev, [invoiceId]: 'delegate' }))
    setHighlighting(prev => new Set([...prev, invoiceId]))
    
    // Step 2: After 1.2s, remove highlight and start slide-out animation
    setTimeout(() => {
      setHighlighting(prev => {
        const newSet = new Set(prev)
        newSet.delete(invoiceId)
        return newSet
      })
      setAnimatingOut(prev => new Set([...prev, invoiceId]))
    }, 1200)
    
    // Step 3: After slide-out animation completes (1.2s + 800ms), actually remove from view
    setTimeout(() => {
      // Find the original invoice data
      const allInvoices = [...pendingApprovals, ...onHoldApprovals, ...overdueApprovals, ...approvedToday, ...rejectedApprovals, ...approvedThisMonth]
      const originalInvoice = allInvoices.find(inv => inv.id === invoiceId)
      
      setDelegatedInvoices(prev => new Set([...prev, invoiceId]))
      setDelegatedDetails(prev => ({
        ...prev,
        [invoiceId]: {
          delegatedTo: assignee,
          dateDelegated: new Date().toISOString().split('T')[0], // Today's date
          originalInvoice: originalInvoice,
          reason: reason,
          comment: comment
        }
      }))
      setAnimatingOut(prev => {
        const newSet = new Set(prev)
        newSet.delete(invoiceId)
        return newSet
      })
    }, 2000) // 1200ms highlight + 800ms slide animation
    
    // Close modal
    setShowDelegationModal(null)
  }

  const handleApproveInvoice = (invoiceId: string, invoiceNumber: string) => {
    console.log(`Approving invoice ${invoiceId}`)
    
    // Step 1: Show toast with 3-second auto-dismiss
    const { dismiss } = toast({
      title: "Invoice Approved",
      description: `Invoice ${invoiceNumber} has been successfully approved.`,
      variant: "default",
    })
    
    // Auto-dismiss toast after 3 seconds
    setTimeout(() => {
      dismiss()
    }, 3000)
    
    // Step 2: Track action type and start green highlight immediately
    setActionTypes(prev => ({ ...prev, [invoiceId]: 'approve' }))
    setHighlighting(prev => new Set([...prev, invoiceId]))
    
    // Step 3: After 1.2s, remove highlight and start slide-out animation
    setTimeout(() => {
      setHighlighting(prev => {
        const newSet = new Set(prev)
        newSet.delete(invoiceId)
        return newSet
      })
      setAnimatingOut(prev => new Set([...prev, invoiceId]))
    }, 1200)
    
    // Step 4: After slide-out animation completes, remove from view
    setTimeout(() => {
      setApprovedInvoices(prev => new Set([...prev, invoiceId]))
      setAnimatingOut(prev => {
        const newSet = new Set(prev)
        newSet.delete(invoiceId)
        return newSet
      })
    }, 2000) // 1200ms highlight + 800ms slide animation
  }

  const handleRejectInvoice = (invoiceId: string, invoiceNumber: string) => {
    console.log(`Rejecting invoice ${invoiceId}`)
    
    // Step 1: Show toast with 3-second auto-dismiss
    const { dismiss } = toast({
      title: "Invoice Rejected",
      description: `Invoice ${invoiceNumber} has been rejected and sent back for review.`,
      variant: "default",
    })
    
    // Auto-dismiss toast after 3 seconds
    setTimeout(() => {
      dismiss()
    }, 3000)
    
    // Step 2: Track action type and start red highlight immediately
    setActionTypes(prev => ({ ...prev, [invoiceId]: 'reject' }))
    setHighlighting(prev => new Set([...prev, invoiceId]))
    
    // Step 3: After 1.2s, remove highlight and start slide-out animation
    setTimeout(() => {
      setHighlighting(prev => {
        const newSet = new Set(prev)
        newSet.delete(invoiceId)
        return newSet
      })
      setAnimatingOut(prev => new Set([...prev, invoiceId]))
    }, 1200)
    
    // Step 4: After slide-out animation completes, remove from view
    setTimeout(() => {
      setRejectedInvoices(prev => new Set([...prev, invoiceId]))
      setAnimatingOut(prev => {
        const newSet = new Set(prev)
        newSet.delete(invoiceId)
        return newSet
      })
    }, 2000) // 1200ms highlight + 800ms slide animation
  }

  const handleRejectWithReason = (invoiceId: string, invoiceNumber: string, reason: string, comment?: string) => {
    console.log(`Rejecting invoice ${invoiceId} with reason: ${reason}`)
    
    // Check if reason should put invoice on hold instead of rejected
    const shouldHold = holdReasons.includes(reason)
    
    if (shouldHold) {
      // Put on hold
      const { dismiss } = toast({
        title: "Invoice On Hold",
        description: `Invoice ${invoiceNumber} has been placed on hold: ${reason}`,
        variant: "default",
      })
      
      setTimeout(() => dismiss(), 3000)
      
      // Track as reject action for visual feedback, but will go to hold
      setActionTypes(prev => ({ ...prev, [invoiceId]: 'reject' }))
      setHighlighting(prev => new Set([...prev, invoiceId]))
      
      setTimeout(() => {
        setHighlighting(prev => {
          const newSet = new Set(prev)
          newSet.delete(invoiceId)
          return newSet
        })
        setAnimatingOut(prev => new Set([...prev, invoiceId]))
      }, 1200)
      
      setTimeout(() => {
        setOnHoldInvoices(prev => new Set([...prev, invoiceId]))
        setAnimatingOut(prev => {
          const newSet = new Set(prev)
          newSet.delete(invoiceId)
          return newSet
        })
      }, 2000)
    } else {
      // Normal rejection
      const { dismiss } = toast({
        title: "Invoice Rejected",
        description: `Invoice ${invoiceNumber} has been rejected: ${reason}`,
        variant: "default",
      })
      
      setTimeout(() => dismiss(), 3000)
      
      setActionTypes(prev => ({ ...prev, [invoiceId]: 'reject' }))
      setHighlighting(prev => new Set([...prev, invoiceId]))
      
      setTimeout(() => {
        setHighlighting(prev => {
          const newSet = new Set(prev)
          newSet.delete(invoiceId)
          return newSet
        })
        setAnimatingOut(prev => new Set([...prev, invoiceId]))
      }, 1200)
      
      setTimeout(() => {
        setRejectedInvoices(prev => new Set([...prev, invoiceId]))
        setRejectionDetails(prev => ({
          ...prev,
          [invoiceId]: {
            reason,
            comment,
            dateRejected: new Date().toISOString().split('T')[0]
          }
        }))
        setAnimatingOut(prev => {
          const newSet = new Set(prev)
          newSet.delete(invoiceId)
          return newSet
        })
      }, 2000)
    }
    
    // Close modal and reset form
    setShowRejectionModal(null)
    setSelectedRejectionReason('')
    setRejectionComment('')
  }
  
  // Placeholder data for different views
  const pendingApprovals = [
    {
      id: '1',
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '2024-01-15',
      supplierName: 'Office Supplies Co.',
      totalAmount: 1250.00,
      dueDate: '2024-02-15',
      status: 'Pending',
      spendCategory: 'Office Supplies',
      glCode: '5100',
      projectCode: 'PROJ-2024-001',
      businessUnit: 'Operations',
      department: 'Admin',
      approverName: 'John Doe',
      poNumber: 'PO-2024-001',
      grNumber: 'GR-2024-001',
      hasGoodsReceipt: true
    },
    {
      id: '2',
      invoiceNumber: 'INV-2024-002',
      invoiceDate: '2024-01-16',
      supplierName: 'Tech Solutions Ltd.',
      totalAmount: 5600.00,
      dueDate: '2024-02-16',
      status: 'Pending',
      spendCategory: 'IT Equipment',
      glCode: '5200',
      projectCode: 'PROJ-2024-002',
      businessUnit: 'IT',
      department: 'Infrastructure',
      approverName: 'John Doe',
      poNumber: null,
      grNumber: null,
      hasGoodsReceipt: false
    },
    {
      id: '5',
      invoiceNumber: 'INV-2024-008',
      invoiceDate: '2024-01-20',
      supplierName: 'Professional Services Inc.',
      totalAmount: 3200.00,
      dueDate: '2024-02-20',
      status: 'Pending',
      spendCategory: 'Consulting',
      glCode: '7100',
      projectCode: 'CONS-2024-003',
      businessUnit: 'Strategy',
      department: 'Business Development',
      approverName: 'John Doe',
      poNumber: 'PO-2024-003',
      grNumber: null,
      hasGoodsReceipt: false
    },
    {
      id: '6',
      invoiceNumber: 'INV-2024-009',
      invoiceDate: '2024-01-21',
      supplierName: 'Facilities Management Corp.',
      totalAmount: 890.00,
      dueDate: '2024-02-21',
      status: 'Pending',
      spendCategory: 'Facilities',
      glCode: '6200',
      projectCode: 'FAC-2024-001',
      businessUnit: 'Operations',
      department: 'Facilities',
      approverName: 'John Doe'
    },
    {
      id: '7',
      invoiceNumber: 'INV-2024-010',
      invoiceDate: '2024-01-22',
      supplierName: 'Legal Advisory Partners',
      totalAmount: 7500.00,
      dueDate: '2024-02-22',
      status: 'Pending',
      spendCategory: 'Legal Services',
      glCode: '8100',
      projectCode: 'LEG-2024-001',
      businessUnit: 'Legal',
      department: 'Corporate Legal',
      approverName: 'John Doe'
    }
  ]

  const approvedToday = [
    {
      id: '3',
      invoiceNumber: 'INV-2024-003',
      invoiceDate: '2024-01-14',
      supplierName: 'Marketing Agency LLC',
      totalAmount: 3200.00,
      dueDate: '2024-02-14',
      status: 'Approved',
      spendCategory: 'Marketing',
      glCode: '6100',
      projectCode: 'MKT-2024-001',
      businessUnit: 'Marketing',
      department: 'Digital',
      approverName: 'John Doe',
      approvedDate: '2024-01-20'
    },
    {
      id: '8',
      invoiceNumber: 'INV-2024-011',
      invoiceDate: '2024-01-18',
      supplierName: 'Cloud Services Provider',
      totalAmount: 1850.00,
      dueDate: '2024-02-18',
      status: 'Approved',
      spendCategory: 'Software',
      glCode: '5300',
      projectCode: 'TECH-2024-004',
      businessUnit: 'IT',
      department: 'Infrastructure',
      approverName: 'John Doe',
      approvedDate: '2024-01-20'
    },
    {
      id: '9',
      invoiceNumber: 'INV-2024-012',
      invoiceDate: '2024-01-19',
      supplierName: 'Travel Services Inc.',
      totalAmount: 945.00,
      dueDate: '2024-02-19',
      status: 'Approved',
      spendCategory: 'Travel',
      glCode: '6300',
      projectCode: 'TRV-2024-002',
      businessUnit: 'Sales',
      department: 'Business Development',
      approverName: 'John Doe',
      approvedDate: '2024-01-20'
    }
  ]

  const approvedThisMonth = [
    ...approvedToday,
    {
      id: '4',
      invoiceNumber: 'INV-2024-004',
      invoiceDate: '2024-01-10',
      supplierName: 'Consulting Partners',
      totalAmount: 8500.00,
      dueDate: '2024-02-10',
      status: 'Approved',
      spendCategory: 'Consulting',
      glCode: '7100',
      projectCode: 'CONS-2024-001',
      businessUnit: 'Operations',
      department: 'Strategy',
      approverName: 'John Doe',
      approvedDate: '2024-01-18'
    },
    {
      id: '10',
      invoiceNumber: 'INV-2024-005',
      invoiceDate: '2024-01-08',
      supplierName: 'Equipment Rental Co.',
      totalAmount: 2400.00,
      dueDate: '2024-02-08',
      status: 'Approved',
      spendCategory: 'Equipment',
      glCode: '5400',
      projectCode: 'EQP-2024-001',
      businessUnit: 'Operations',
      department: 'Production',
      approverName: 'John Doe',
      approvedDate: '2024-01-15'
    },
    {
      id: '11',
      invoiceNumber: 'INV-2024-006',
      invoiceDate: '2024-01-05',
      supplierName: 'Training Solutions Ltd.',
      totalAmount: 1675.00,
      dueDate: '2024-02-05',
      status: 'Approved',
      spendCategory: 'Training',
      glCode: '6400',
      projectCode: 'TRN-2024-001',
      businessUnit: 'HR',
      department: 'Learning & Development',
      approverName: 'John Doe',
      approvedDate: '2024-01-12'
    },
    {
      id: '12',
      invoiceNumber: 'INV-2024-007',
      invoiceDate: '2024-01-03',
      supplierName: 'Security Services Corp.',
      totalAmount: 3850.00,
      dueDate: '2024-02-03',
      status: 'Approved',
      spendCategory: 'Security',
      glCode: '6500',
      projectCode: 'SEC-2024-001',
      businessUnit: 'Operations',
      department: 'Security',
      approverName: 'John Doe',
      approvedDate: '2024-01-10'
    }
  ]

  const onHoldApprovals = [
    {
      id: '13',
      invoiceNumber: 'INV-2024-013',
      invoiceDate: '2024-01-17',
      supplierName: 'New Vendor Solutions',
      totalAmount: 4200.00,
      dueDate: '2024-02-17',
      status: 'On Hold',
      spendCategory: 'Professional Services',
      glCode: '7200',
      projectCode: 'PROF-2024-001',
      businessUnit: 'Operations',
      department: 'Procurement',
      approverName: 'John Doe',
      holdReason: 'Awaiting vendor verification documents'
    },
    {
      id: '14',
      invoiceNumber: 'INV-2024-014',
      invoiceDate: '2024-01-19',
      supplierName: 'Budget Query Corp.',
      totalAmount: 12500.00,
      dueDate: '2024-02-19',
      status: 'On Hold',
      spendCategory: 'Consulting',
      glCode: '7100',
      projectCode: 'CONS-2024-004',
      businessUnit: 'Finance',
      department: 'Strategic Planning',
      approverName: 'John Doe',
      holdReason: 'Budget allocation confirmation needed'
    }
  ]

  const overdueApprovals = [
    {
      id: '15',
      invoiceNumber: 'INV-2024-015',
      invoiceDate: '2024-01-12',
      supplierName: 'Urgent Services Ltd.',
      totalAmount: 2800.00,
      dueDate: '2024-01-25',
      status: 'Overdue',
      spendCategory: 'Emergency Services',
      glCode: '6600',
      projectCode: 'EMRG-2024-001',
      businessUnit: 'Operations',
      department: 'Facilities',
      approverName: 'John Doe',
      daysPastDue: 3
    },
    {
      id: '16',
      invoiceNumber: 'INV-2024-016',
      invoiceDate: '2024-01-10',
      supplierName: 'Critical Systems Inc.',
      totalAmount: 9200.00,
      dueDate: '2024-01-23',
      status: 'Overdue',
      spendCategory: 'IT Services',
      glCode: '5200',
      projectCode: 'IT-2024-005',
      businessUnit: 'IT',
      department: 'Infrastructure',
      approverName: 'John Doe',
      daysPastDue: 5
    }
  ]

  const rejectedApprovals = [
    {
      id: '17',
      invoiceNumber: 'INV-2024-017',
      invoiceDate: '2024-01-16',
      supplierName: 'Incorrect Details Co.',
      totalAmount: 1500.00,
      dueDate: '2024-02-16',
      status: 'Rejected',
      spendCategory: 'Office Supplies',
      glCode: '5100',
      projectCode: 'OFF-2024-002',
      businessUnit: 'Operations',
      department: 'Admin',
      approverName: 'John Doe',
      rejectedDate: '2024-01-19',
      rejectionReason: 'Invoice amount does not match PO'
    }
  ]

  const getApprovalsList = () => {
    let baseList = []
    switch (activeView) {
      case 'pending':
        // Include both pending and overdue invoices - overdue items still need approval!
        baseList = [...pendingApprovals, ...overdueApprovals]
        break
      case 'on-hold':
        baseList = onHoldApprovals
        break
      case 'overdue':
        baseList = overdueApprovals
        break
      case 'approved-today':
        baseList = approvedToday
        break
      case 'rejected':
        baseList = rejectedApprovals
        break
      case 'approved-month':
        baseList = approvedThisMonth
        break
      case 'delegated':
        // Return delegated invoices with their original data
        baseList = Object.values(delegatedDetails).map(detail => detail.originalInvoice).filter(Boolean)
        break
      case 'all':
        // Return all invoices from all categories, deduplicating by ID
        const allInvoices = [...pendingApprovals, ...onHoldApprovals, ...overdueApprovals, ...approvedToday, ...rejectedApprovals, ...approvedThisMonth]
        const uniqueInvoicesMap = new Map()
        allInvoices.forEach(invoice => {
          if (!uniqueInvoicesMap.has(invoice.id)) {
            uniqueInvoicesMap.set(invoice.id, invoice)
          }
        })
        baseList = Array.from(uniqueInvoicesMap.values())
        break
      default:
        baseList = pendingApprovals
    }
    
    // Filter out processed invoices based on view and mode
    if (userRole === 'user' && activeView !== 'delegated') {
      return baseList.filter(invoice => 
        !delegatedInvoices.has(invoice.id) && 
        !approvedInvoices.has(invoice.id) && 
        !rejectedInvoices.has(invoice.id) && 
        !onHoldInvoices.has(invoice.id)
      )
    } else if (activeView === 'pending' || activeView === 'overdue') {
      // In pending/overdue view, filter out processed invoices for all users
      return baseList.filter(invoice => 
        !approvedInvoices.has(invoice.id) && 
        !rejectedInvoices.has(invoice.id) && 
        !onHoldInvoices.has(invoice.id)
      )
    }
    
    return baseList
  }

  // Calculate if we need horizontal scroll based on column count
  const getColumnCount = () => {
    let baseColumns = 10 // Invoice#, Date, Supplier, Amount, Due, PO/GR, Status, Category, GL, Dept
    
    if (activeView === 'delegated') {
      baseColumns += 4 // Delegated To, Date Delegated, Reason, Actions
    } else {
      baseColumns += 1 // Assign/Delegate column
    }
    
    if (activeView === 'pending') baseColumns += 1 // Actions
    if (activeView === 'approved-today' || activeView === 'approved-month') baseColumns += 1 // Approved Date
    if (activeView === 'rejected') baseColumns += 1 // Rejected Date  
    if (activeView === 'on-hold') baseColumns += 1 // Hold Reason
    if (activeView === 'overdue') baseColumns += 1 // Days Overdue
    
    return baseColumns
  }

  const needsHorizontalScroll = getColumnCount() > 11 // Threshold for enabling scroll

  // Get highlight color based on the action being performed
  const getHighlightColor = (invoiceId: string) => {
    const actionType = actionTypes[invoiceId]
    
    switch (actionType) {
      case 'approve':
        return 'bg-green-50 hover:bg-green-50'
      case 'reject':
        return 'bg-red-50 hover:bg-red-50'
      case 'delegate':
        return 'bg-purple-50 hover:bg-purple-50'
      default:
        return 'bg-green-50 hover:bg-green-50' // Default fallback
    }
  }

  const getViewTitle = () => {
    switch (activeView) {
      case 'pending':
        return 'Pending Approvals'
      case 'on-hold':
        return 'On Hold'
      case 'overdue':
        return 'Overdue Approvals'
      case 'all':
        return 'All Invoices'
      case 'approved-today':
        return 'Approved Today'
      case 'rejected':
        return 'Rejected Invoices'
      case 'approved-month':
        return 'Approved This Month'
      case 'delegated':
        return 'Delegated Invoices'
      default:
        return 'Pending Approvals'
    }
  }

  const getViewDescription = () => {
    switch (activeView) {
      case 'pending':
        return 'Invoices awaiting your approval'
      case 'on-hold':
        return 'Invoices temporarily on hold awaiting additional information'
      case 'overdue':
        return 'Urgent invoices that require immediate attention'
      case 'all':
        return 'Complete view of all invoices across all statuses'
      case 'approved-today':
        return 'Invoices you approved today'
      case 'rejected':
        return 'Invoices that were rejected and need rework'
      case 'approved-month':
        return 'All invoices approved this month'
      case 'delegated':
        return 'Invoices you have delegated to other team members'
      default:
        return 'Invoices awaiting your approval'
    }
  }

  const getEmptyStateContent = () => {
    switch (activeView) {
      case 'pending':
        return {
          icon: <Sparkles className="h-12 w-12 text-purple-400" />,
          title: "You're all caught up!",
          description: "No pending approvals at the moment. New invoices will appear here when they need your attention.",
          actionLabel: "View All Invoices",
          actionView: 'all' as ViewType
        }
      default:
        return {
          icon: <Inbox className="h-12 w-12 text-gray-400" />,
          title: "No invoices",
          description: "No invoices to display.",
          actionLabel: null,
          actionView: null
        }
    }
  }

  // Main component render  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="invoices" />
      <div className="flex-1 flex flex-col min-w-0">
        <MainHeader activePage="approvals" />
        
        <main className="flex-1 overflow-auto bg-gray-50/50 min-w-0">
          <div className="p-6 min-w-0">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">
                {userRole === 'user' ? 'My Approvals' : 'Team Approvals'}
              </h1>
              
              {/* Compact Team Workload Widget - Admin Only */}
              {userRole === 'admin' && (
                <button
                  onClick={() => setShowTeamWorkloadDrawer(true)}
                  className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {teamWorkloadData.filter(m => m.status === 'available').length}/{teamWorkloadData.length} available
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((teamWorkloadData.reduce((sum, m) => sum + m.currentWorkload.pending, 0) / teamWorkloadData.reduce((sum, m) => sum + m.capacity, 0)) * 100)}% capacity
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Mini status indicators */}
                    <div className="flex -space-x-1">
                      {teamWorkloadData.slice(0, 4).map((member, idx) => (
                        <div
                          key={member.id}
                          className={`w-2 h-2 rounded-full border border-white ${
                            member.status === 'available' ? 'bg-green-500' :
                            member.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                          }`}
                          style={{ zIndex: 10 - idx }}
                        />
                      ))}
                      {teamWorkloadData.length > 4 && (
                        <div className="w-2 h-2 rounded-full bg-gray-300 border border-white" style={{ zIndex: 5 }}>
                          <span className="sr-only">+{teamWorkloadData.length - 4} more</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </button>
              )}
            </div>

            {/* Priority Action Cards - Compact */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'pending' 
                    ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow shadow-purple-300/50' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('pending')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Pending Approval</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {userRole === 'user' 
                          ? [...pendingApprovals, ...overdueApprovals].filter(invoice => !delegatedInvoices.has(invoice.id)).length 
                          : pendingApprovals.length + overdueApprovals.length}
                      </p>
                      {userRole === 'admin' && (
                        <div className="mt-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                              {pendingApprovals.length + overdueApprovals.length} inv. across {teamWorkloadData.filter(m => m.currentWorkload.pending > 0).length} members
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(((pendingApprovals.length + overdueApprovals.length) / 20) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-full ${
                      activeView === 'pending' ? 'bg-gradient-to-br from-purple-400 to-purple-500' : 'bg-purple-100'
                    }`}>
                      <Clock className={`h-4 w-4 ${
                        activeView === 'pending' ? 'text-white' : 'text-purple-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'overdue' 
                    ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 shadow shadow-red-300/50' 
                    : 'border-gray-200 hover:border-red-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('overdue')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {userRole === 'user' 
                          ? overdueApprovals.filter(invoice => !delegatedInvoices.has(invoice.id)).length 
                          : overdueApprovals.length}
                      </p>
                      {userRole === 'admin' && overdueApprovals.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs text-red-600 font-medium">
                            Needs immediate attention
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-full ${
                      activeView === 'overdue' ? 'bg-gradient-to-br from-red-400 to-red-500' : 'bg-red-100'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        activeView === 'overdue' ? 'text-white' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'on-hold' 
                    ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow shadow-orange-300/50' 
                    : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('on-hold')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">On Hold</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {userRole === 'user' 
                          ? onHoldApprovals.filter(invoice => !delegatedInvoices.has(invoice.id)).length 
                          : onHoldApprovals.length}
                      </p>
                      {userRole === 'admin' && onHoldApprovals.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs text-orange-600">
                            {teamWorkloadData.filter(m => m.status === 'out-of-office').length > 0 
                              ? `${teamWorkloadData.filter(m => m.status === 'out-of-office').length} team member(s) unavailable`
                              : 'Awaiting documentation'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-full ${
                      activeView === 'on-hold' ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-orange-100'
                    }`}>
                      <Pause className={`h-4 w-4 ${
                        activeView === 'on-hold' ? 'text-white' : 'text-orange-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'all' 
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow shadow-blue-300/50' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('all')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">All Invoices</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {pendingApprovals.length + onHoldApprovals.length + overdueApprovals.length + approvedToday.length + rejectedApprovals.length + approvedThisMonth.length}
                      </p>
                      {userRole === 'admin' && (
                        <div className="mt-1">
                          <span className="text-xs text-blue-600">
                            Avg {Math.round((teamWorkloadData.reduce((sum, m) => sum + m.avgApprovalTime, 0) / teamWorkloadData.length) * 10) / 10}h processing time
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-full ${
                      activeView === 'all' ? 'bg-gradient-to-br from-blue-400 to-blue-500' : 'bg-blue-100'
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        activeView === 'all' ? 'text-white' : 'text-blue-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Horizontal Summary Bar */}
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 mb-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Temporal Group - Approved Metrics */}
                  <div className="flex items-center gap-2">
                    <div 
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                        activeView === 'approved-today' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
                      }`}
                      onClick={() => setActiveView('approved-today')}
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">{approvedToday.length} Today</span>
                    </div>

                    <div 
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                        activeView === 'approved-month' 
                          ? 'bg-blue-100 text-blue-800 border-blue-200' 
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                      onClick={() => setActiveView('approved-month')}
                    >
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">{approvedThisMonth.length} This Month</span>
                    </div>
                  </div>

                  {/* Visual Separator */}
                  <div className="h-6 w-px bg-gray-300"></div>

                  {/* Status Group */}
                  <div className="flex items-center gap-2">
                    <div 
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                        activeView === 'rejected' 
                          ? 'bg-gray-100 text-gray-800 border-gray-300' 
                          : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm'
                      }`}
                      onClick={() => setActiveView('rejected')}
                    >
                      <X className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">{rejectedApprovals.length} Rejected</span>
                    </div>

                    {/* Delegated Metric - Only show in user mode */}
                    {userRole === 'user' && delegatedInvoices.size > 0 && (
                      <div 
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                          activeView === 'delegated' 
                            ? 'bg-gray-100 text-gray-800 border-gray-300' 
                            : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm'
                        }`}
                        onClick={() => setActiveView('delegated')}
                      >
                        <Forward className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">{delegatedInvoices.size} Delegated</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-violet-100/70 to-purple-100/70 rounded-full cursor-help">
                          <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                          <span className="text-sm font-medium text-violet-800">
                            {Math.round((approvedThisMonth.length / (pendingApprovals.length + approvedThisMonth.length + onHoldApprovals.length + overdueApprovals.length + rejectedApprovals.length)) * 100)}% Rate
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Approval rate: Percentage of invoices approved out of all processed invoices this month 
                          ({approvedThisMonth.length} approved out of {pendingApprovals.length + approvedThisMonth.length + onHoldApprovals.length + overdueApprovals.length + rejectedApprovals.length} total)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="text-xs text-gray-500">
                    Updated just now
                  </div>
                </div>
              </div>
            </div>


            {/* Approvals Table */}
            <Card className="overflow-hidden min-w-0">
              <CardHeader className="pb-2">
                <div className="flex items-end justify-between">
                  <div className="space-y-0">
                    <CardTitle className="text-lg">{getViewTitle()}</CardTitle>
                    <CardDescription className="mt-0">
                      {getViewDescription()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-56">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="search" 
                        placeholder="Search invoices..." 
                        className="w-full pl-8 h-9 text-sm"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-9 px-3 text-sm border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-2 min-w-0">
                <div className={needsHorizontalScroll ? 'overflow-x-auto' : ''}>
                  <Table style={needsHorizontalScroll ? { minWidth: '1200px' } : {}} className="w-full">
                  <TableHeader>
                    <TableRow>
                      {supportsBulkOperations() && (
                        <TableHead className="w-12">
                          <div className="relative inline-flex">
                            <Checkbox
                              checked={isAllSelected()}
                              onCheckedChange={handleSelectAll}
                              className="data-[state=indeterminate]:bg-violet-600 data-[state=indeterminate]:border-violet-600"
                              {...(isSomeSelected() ? { 'data-state': 'indeterminate' } : {})}
                            />
                            {isSomeSelected() && !isAllSelected() && (
                              <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center pointer-events-none">
                                <div className="w-2 h-px bg-white"></div>
                              </div>
                            )}
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="whitespace-nowrap">Invoice Number</TableHead>
                      <TableHead className="whitespace-nowrap">Invoice Date</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      {activeView === 'overdue' && <TableHead className="whitespace-nowrap">Days Overdue</TableHead>}
                      <TableHead className="whitespace-nowrap">PO/GR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Spend Category</TableHead>
                      <TableHead className="whitespace-nowrap">GL Code</TableHead>
                      <TableHead>Department</TableHead>
                      {activeView !== 'delegated' && <TableHead className="text-center whitespace-nowrap">{userRole === 'user' ? 'Delegate' : 'Assign'}</TableHead>}
                      {activeView === 'delegated' && <TableHead className="whitespace-nowrap min-w-[140px]">Delegated To</TableHead>}
                      {activeView === 'delegated' && <TableHead className="whitespace-nowrap">Date Delegated</TableHead>}
                      {activeView === 'delegated' && <TableHead className="min-w-[150px]">Reason</TableHead>}
                      {(activeView === 'approved-today' || activeView === 'approved-month') && <TableHead className="whitespace-nowrap">Approved Date</TableHead>}
                      {activeView === 'rejected' && <TableHead className="whitespace-nowrap">Rejected Date</TableHead>}
                      {activeView === 'rejected' && <TableHead className="min-w-[150px]">Rejection Reason</TableHead>}
                      {activeView === 'on-hold' && <TableHead className="min-w-[150px]">Hold Reason</TableHead>}
                      {(activeView === 'pending' || activeView === 'overdue') && <TableHead className="text-center whitespace-nowrap">Actions</TableHead>}
                      {activeView === 'delegated' && <TableHead className="text-center whitespace-nowrap">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getApprovalsList().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={supportsBulkOperations() ? 101 : 100} className="h-64">
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="mb-4">
                              {getEmptyStateContent().icon}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {getEmptyStateContent().title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-6 max-w-md">
                              {getEmptyStateContent().description}
                            </p>
                            {getEmptyStateContent().actionLabel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveView(getEmptyStateContent().actionView!)}
                                className="gap-2"
                              >
                                {getEmptyStateContent().actionLabel}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      getApprovalsList().map((approval) => (
                      <TableRow 
                        key={approval.id}
                        className={`transition-all ease-in-out ${
                          highlighting.has(approval.id)
                            ? getHighlightColor(approval.id) + ' duration-200'
                            : animatingOut.has(approval.id)
                            ? 'opacity-0 transform translate-x-8 duration-800'
                            : 'opacity-100 transform translate-x-0 duration-200 hover:bg-gray-50'
                        }`}
                      >
                        {supportsBulkOperations() && (
                          <TableCell className="py-2">
                            <Checkbox
                              checked={selectedInvoices.has(approval.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(approval.id, checked as boolean)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium py-2">
                          <button 
                            onClick={() => handleInvoiceClick(approval.id)}
                            className="text-blue-600 hover:underline focus:outline-none"
                          >
                            {approval.invoiceNumber}
                          </button>
                        </TableCell>
                        <TableCell className="py-2">{approval.invoiceDate}</TableCell>
                        <TableCell className="max-w-[200px] truncate py-2">{approval.supplierName}</TableCell>
                        <TableCell className="text-right font-medium py-2">${approval.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="py-2">{approval.dueDate}</TableCell>
                        {activeView === 'overdue' && <TableCell className="py-2"><Badge variant="destructive" className="bg-red-500">{(approval as any).daysPastDue} days</Badge></TableCell>}
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            {(approval as any).poNumber ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                PO
                              </Badge>
                            ) : null}
                            {(approval as any).hasGoodsReceipt ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                GR
                              </Badge>
                            ) : null}
                            {!(approval as any).poNumber && !(approval as any).hasGoodsReceipt ? (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 text-xs">
                                Non-PO
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge 
                            variant="secondary" 
                            className={
                              approval.status === 'Pending' 
                                ? "bg-yellow-100 text-yellow-800" 
                                : approval.status === 'Approved'
                                ? "bg-green-100 text-green-800"
                                : approval.status === 'On Hold'
                                ? "bg-orange-100 text-orange-800"
                                : approval.status === 'Overdue'
                                ? "bg-red-100 text-red-800"
                                : approval.status === 'Rejected'
                                ? "bg-gray-100 text-gray-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">{approval.spendCategory}</TableCell>
                        <TableCell className="py-2">{approval.glCode}</TableCell>
                        <TableCell className="py-2">{approval.department}</TableCell>
                        {activeView !== 'delegated' && (
                        <TableCell className="text-center py-2">
                          <DropdownMenu>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <button className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                                      assignments[approval.id] 
                                        ? `border-solid ${assignments[approval.id].color.replace('bg-', 'border-')}` 
                                        : 'border-dashed border-gray-300 hover:border-gray-400'
                                    }`}>
                                      {assignments[approval.id] ? (
                                        <div className={`w-full h-full rounded-full ${assignments[approval.id].color} flex items-center justify-center`}>
                                          <span className="text-xs font-medium text-white">
                                            {assignments[approval.id].initials}
                                          </span>
                                        </div>
                                      ) : (
                                        <Plus className="h-4 w-4 text-gray-400" />
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  <p>{userRole === 'user' ? 'Delegate this invoice to someone else' : 'Assign this invoice to a team member'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent align="end" className="w-56">
                              {userRole === 'user' && (
                                <>
                                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                                    Delegate to:
                                  </div>
                                </>
                              )}
                              {assigneeOptions
                                .filter(assignee => userRole === 'admin' || assignee.name !== currentUser.name)
                                .map((assignee) => (
                                <DropdownMenuItem
                                  key={assignee.initials}
                                  onClick={() => handleReassignInvoice(approval.id, assignee)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full ${assignee.color} flex items-center justify-center`}>
                                      <span className="text-xs font-medium text-white">
                                        {assignee.initials}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{assignee.name}</span>
                                      <span className="text-xs text-gray-500">{assignee.role}</span>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        )}
                        
                        {/* Delegated columns */}
                        {activeView === 'delegated' && (
                          <>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full ${delegatedDetails[approval.id]?.delegatedTo?.color || 'bg-gray-400'} flex items-center justify-center`}>
                                  <span className="text-xs font-medium text-white">
                                    {delegatedDetails[approval.id]?.delegatedTo?.initials || '?'}
                                  </span>
                                </div>
                                <span className="text-sm">{delegatedDetails[approval.id]?.delegatedTo?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">{delegatedDetails[approval.id]?.dateDelegated || 'Unknown'}</TableCell>
                            <TableCell className="max-w-[180px] py-2">
                              <div className="text-sm text-gray-600">
                                <div className="truncate">
                                  {delegatedDetails[approval.id]?.reason || 'No reason provided'}
                                </div>
                                {delegatedDetails[approval.id]?.reason === 'Other...' && delegatedDetails[approval.id]?.comment && (
                                  <div className="text-xs text-gray-500 mt-1 truncate" title={delegatedDetails[approval.id].comment}>
                                    {delegatedDetails[approval.id].comment}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </>
                        )}
                        
                        {(activeView === 'approved-today' || activeView === 'approved-month') && <TableCell className="py-2">{(approval as any).approvedDate}</TableCell>}
                        {activeView === 'rejected' && <TableCell className="py-2">{rejectionDetails[approval.id]?.dateRejected || (approval as any).rejectedDate}</TableCell>}
                        {activeView === 'rejected' && (
                          <TableCell className="text-sm text-gray-600 py-2 max-w-[180px]">
                            <div className="truncate">
                              {rejectionDetails[approval.id]?.reason || (approval as any).rejectionReason || 'No reason provided'}
                            </div>
                            {rejectionDetails[approval.id]?.comment && (
                              <div className="text-xs text-gray-500 mt-1 truncate" title={rejectionDetails[approval.id].comment}>
                                {rejectionDetails[approval.id].comment}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {activeView === 'on-hold' && <TableCell className="text-sm text-gray-600 py-2">{(approval as any).holdReason}</TableCell>}
                        {(activeView === 'pending' || activeView === 'overdue') && (
                          <TableCell className="text-center py-2">
                            <div className="flex gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleApproveInvoice(approval.id, approval.invoiceNumber)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="center">
                                    <p>Approve this invoice</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              {/* Split Button for Reject */}
                              <div className="flex">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-r-none border-r-0"
                                        onClick={() => handleRejectInvoice(approval.id, approval.invoiceNumber)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="end">
                                      <p>Reject this invoice</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <DropdownMenu>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-gray-500 hover:text-gray-600 hover:bg-gray-50 rounded-l-none px-1"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end">
                                        <p>Reject with reason</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                                      Reason for rejection:
                                    </div>
                                    {rejectionReasons.map((reason) => (
                                      <DropdownMenuItem
                                        key={reason}
                                        onClick={() => {
                                          if (reason === 'Other...') {
                                            setShowRejectionModal({ invoiceId: approval.id, invoiceNumber: approval.invoiceNumber })
                                          } else {
                                            handleRejectWithReason(approval.id, approval.invoiceNumber, reason)
                                          }
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <span className="text-sm">{reason}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {activeView === 'delegated' && (
                          <TableCell className="text-center py-2">
                            <div className="flex gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => {
                                        // Remove from delegated and put back to user's queue
                                        setDelegatedInvoices(prev => {
                                          const newSet = new Set(prev)
                                          newSet.delete(approval.id)
                                          return newSet
                                        })
                                        setDelegatedDetails(prev => {
                                          const newDetails = { ...prev }
                                          delete newDetails[approval.id]
                                          return newDetails
                                        })
                                        setAssignments(prev => {
                                          const newAssignments = { ...prev }
                                          delete newAssignments[approval.id] // Remove assignment to show + icon
                                          return newAssignments
                                        })
                                        setActiveView('pending')
                                      }}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" align="center">
                                    <p>Take back this invoice to your pending queue</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Bottom Left Role Switch - Better Options */}
          {/* Option 2: Segmented Control Style (Currently Active) */}
          <div className="fixed bottom-6 left-20 z-10">
            <div className="bg-gray-100 rounded-full p-0.5 shadow-lg flex items-center">
              <button
                onClick={() => setUserRole('user')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userRole === 'user' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <User className="h-3 w-3" />
                User
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userRole === 'admin' 
                    ? 'bg-white text-violet-600 shadow-sm' 
                    : 'text-gray-600 hover:text-violet-600'
                }`}
              >
                <Settings className="h-3 w-3" />
                Admin
              </button>
            </div>
          </div>

          {/* Option 1: Toggle Buttons (uncomment to revert) */}
          {/* <div className="fixed bottom-6 left-20 z-10">
            <div className="bg-white border border-gray-200 rounded-full p-1 shadow-lg flex items-center gap-1">
              <button
                onClick={() => setUserRole('user')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userRole === 'user' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                }`}
              >
                <User className="h-3 w-3" />
                <span>User</span>
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  userRole === 'admin' 
                    ? 'bg-violet-500 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-violet-500 hover:bg-violet-50'
                }`}
              >
                <Settings className="h-3 w-3" />
                <span>Admin</span>
              </button>
            </div>
          </div> */}

          {/* Option 3: Single Badge with Active State (uncomment to try) */}
          {/* <button 
            onClick={() => setUserRole(userRole === 'user' ? 'admin' : 'user')}
            className="fixed bottom-6 left-20 z-10 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-lg flex items-center gap-2 hover:shadow-xl transition-all text-xs font-medium"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              userRole === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
            }`}>
              {userRole === 'user' ? <User className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
            </div>
            <span className={userRole === 'user' ? 'text-blue-600' : 'text-violet-600'}>
              {userRole === 'user' ? 'User Mode' : 'Admin Mode'}
            </span>
          </button> */}

          {/* Option 4: Tabs Style (uncomment to try) */}
          {/* <div className="fixed bottom-6 left-20 z-10">
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex">
              <button
                onClick={() => setUserRole('user')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-r ${
                  userRole === 'user' 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50 border-gray-200'
                }`}
              >
                <User className="h-3 w-3" />
                User
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                  userRole === 'admin' 
                    ? 'bg-violet-50 text-violet-600' 
                    : 'text-gray-500 hover:text-violet-500 hover:bg-violet-50'
                }`}
              >
                <Settings className="h-3 w-3" />
                Admin
              </button>
            </div>
          </div> */}
        </main>
      </div>

      {/* Delegation Modal */}
      <Dialog open={!!showDelegationModal} onOpenChange={() => setShowDelegationModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delegate Invoice</DialogTitle>
            <DialogDescription>
              Delegating invoice {showDelegationModal?.invoiceId} to{' '}
              <span className="font-medium">{showDelegationModal?.assignee.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for delegation</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {delegationReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReason === 'Other...' && (
              <div>
                <Label htmlFor="comment">Additional details</Label>
                <Textarea
                  id="comment"
                  value={delegationComment}
                  onChange={(e) => setDelegationComment(e.target.value)}
                  placeholder="Please provide more details..."
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDelegationModal(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleDelegateWithReason(selectedReason, delegationComment)}
              disabled={!selectedReason}
            >
              Delegate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal - Only for "Other..." reason */}
      <Dialog open={!!showRejectionModal} onOpenChange={() => setShowRejectionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Please provide additional details for rejecting invoice {showRejectionModal?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionComment">Reason for rejection</Label>
              <Textarea
                id="rejectionComment"
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Please provide details for the rejection..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectionModal(null)
                setRejectionComment('')
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (showRejectionModal) {
                  handleRejectWithReason(
                    showRejectionModal.invoiceId, 
                    showRejectionModal.invoiceNumber, 
                    'Other...',
                    rejectionComment
                  )
                }
              }}
              disabled={!rejectionComment.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />

      {/* Bulk Actions Toolbar - Compact Floating Design */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-in-out ${
        selectedInvoices.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
      }`}>
        <div className="bg-white rounded-full shadow-xl border border-gray-200 px-4 py-2 flex items-center gap-3">
          {/* Selection Count */}
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
            <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-violet-600">{selectedInvoices.size}</span>
            </div>
            <span className="text-sm text-gray-700 font-medium">selected</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {(activeView === 'pending' || activeView === 'overdue') && (
              <>
                <Button
                  size="sm"
                  className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs"
                  onClick={() => {
                    toast({
                      title: "Bulk Approval",
                      description: `${selectedInvoices.size} invoices approved`,
                      className: "bg-green-50 border-green-200 text-green-800",
                    })
                    setSelectedInvoices(new Set())
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full text-xs"
                  onClick={() => {
                    toast({
                      title: "Bulk Rejection",
                      description: `${selectedInvoices.size} invoices rejected`,
                      variant: "destructive",
                    })
                    setSelectedInvoices(new Set())
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {(activeView === 'pending' || activeView === 'overdue') && userRole === 'user' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-full text-xs"
                onClick={() => {
                  toast({
                    title: "Bulk Delegation",
                    description: `${selectedInvoices.size} invoices delegated`,
                  })
                  setSelectedInvoices(new Set())
                }}
              >
                <Forward className="h-3 w-3 mr-1" />
                Delegate
              </Button>
            )}
            
            {(activeView === 'pending' || activeView === 'overdue') && userRole === 'admin' && (
              <Button
                size="sm"
                className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-xs"
                onClick={() => setShowBulkAssignmentDrawer(true)}
              >
                <Users className="h-3 w-3 mr-1" />
                Assign
              </Button>
            )}
            
            {activeView === 'on-hold' && (
              <Button
                size="sm"
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs"
                onClick={() => {
                  toast({
                    title: "Released from Hold",
                    description: `${selectedInvoices.size} invoices released`,
                  })
                  setSelectedInvoices(new Set())
                }}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Release
              </Button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => setSelectedInvoices(new Set())}
            className="ml-2 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Invoice Preview Drawer */}
      <>
        {/* Backdrop - no mask, just for closing */}
        <div 
          className={`fixed inset-0 z-40 transition-opacity duration-500 ease-in-out ${
            selectedInvoiceId ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseInvoice}
        />
        
        {/* Drawer */}
        <div className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-all duration-500 ease-in-out flex flex-col ${
          selectedInvoiceId ? 'translate-x-0' : 'translate-x-full'
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Invoice #{sampleInvoiceData.invoiceNumber}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCloseInvoice}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-4 min-h-0">
              {/* Enhanced Hero Section with AI Integration */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Main Hero Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left side - Amount and Status */}
                    <div className="flex-1">
                      <div className="text-xs text-gray-600">Total Amount</div>
                      <div className="text-2xl font-semibold text-gray-900 mb-2">{sampleInvoiceData.totalAmount}</div>
                      
                      {/* Status and Timeline */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-amber-200/50 text-amber-800 hover:bg-amber-200/70 text-xs font-medium">
                          Pending Approval
                        </Badge>
                        <Badge className="bg-blue-100/50 text-blue-800 hover:bg-blue-100/70 text-xs font-medium">
                          <Clock className="h-3 w-3 mr-1" />
                          28 days left
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-600">
                        Due <span className="font-medium text-gray-900">{sampleInvoiceData.dueDate}</span>
                      </div>
                    </div>
                    
                    {/* Right side - Quick Actions (Legacy) */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-xs justify-start"
                        onClick={() => {
                          // Handle approve action
                          toast({
                            title: "Invoice Approved",
                            description: `Invoice ${sampleInvoiceData.invoiceNumber} has been approved.`,
                            className: "bg-green-50 border-green-200 text-green-800",
                          })
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 text-xs justify-start"
                        onClick={() => {
                          // Handle reject action
                          toast({
                            title: "Invoice Rejected",
                            description: `Invoice ${sampleInvoiceData.invoiceNumber} has been rejected.`,
                            variant: "destructive",
                          })
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 text-xs justify-start"
                        onClick={() => {
                          // Handle delegate action
                          toast({
                            title: "Invoice Delegated",
                            description: `Invoice ${sampleInvoiceData.invoiceNumber} has been delegated.`,
                          })
                        }}
                      >
                        <Forward className="h-3 w-3 mr-1" />
                        Delegate
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Smart Suggestions Section */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setSmartSuggestionsExpanded(!smartSuggestionsExpanded)}
                    className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-medium text-slate-700">Smart Suggestions</span>
                      <span className="text-xs text-slate-500">(AI-powered)</span>
                      
                      {/* Count bubble */}
                      <div className="inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full">
                        2
                      </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      smartSuggestionsExpanded ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {smartSuggestionsExpanded && (
                    <div className="px-4 py-3 space-y-3">
                      {/* AI Validation */}
                      <SmartValidationBadges 
                        badges={generateValidationBadges(
                          {
                            ...sampleInvoiceData,
                            totalAmount: 4086.10,
                            supplierName: 'WOODPECKER SCHOOL & OFFICE SUPPLIES',
                            department: 'Marketing',
                            attachments: ['invoice.pdf', 'receipt.pdf']
                          },
                          { 
                            amount: 4000, 
                            poNumber: 'PO-2024-0456',
                            items: sampleInvoiceData.lineItems 
                          },
                          { 
                            status: 'received', 
                            receivedDate: '2024-01-20',
                            items: sampleInvoiceData.lineItems 
                          }
                        )}
                        onBadgeClick={(badge) => {
                          toast({
                            title: badge.label,
                            description: badge.description,
                            className: badge.type === 'error' ? "bg-red-50 border-red-200 text-red-800" :
                                      badge.type === 'warning' ? "bg-amber-50 border-amber-200 text-amber-800" :
                                      badge.type === 'success' ? "bg-green-50 border-green-200 text-green-800" :
                                      "bg-blue-50 border-blue-200 text-blue-800"
                          })
                        }}
                      />
                      
                      {/* AI Recommendations */}
                      <PredictiveActions 
                        actions={generatePredictiveActions(
                          {
                            ...sampleInvoiceData,
                            totalAmount: 4086.10,
                            supplierName: 'WOODPECKER SCHOOL & OFFICE SUPPLIES',
                            department: 'Marketing',
                            dueDate: '2024-02-14',
                            attachments: ['invoice.pdf', 'receipt.pdf']
                          },
                          generateValidationBadges(
                            {
                              ...sampleInvoiceData,
                              totalAmount: 4086.10,
                              supplierName: 'WOODPECKER SCHOOL & OFFICE SUPPLIES',
                              department: 'Marketing',
                              attachments: ['invoice.pdf', 'receipt.pdf']
                            },
                            { 
                              amount: 4000, 
                              poNumber: 'PO-2024-0456',
                              items: sampleInvoiceData.lineItems 
                            },
                            { 
                              status: 'received', 
                              receivedDate: '2024-01-20',
                              items: sampleInvoiceData.lineItems 
                            }
                          ),
                          { id: 'current-user', name: 'John Doe', approvalLimit: 10000 },
                          () => {
                            // Approve action
                            toast({
                              title: "Invoice Approved via AI Recommendation",
                              description: `Invoice ${sampleInvoiceData.invoiceNumber} has been approved based on AI analysis.`,
                              className: "bg-green-50 border-green-200 text-green-800",
                            })
                            setSelectedInvoiceId(null)
                          },
                          () => {
                            // Reject action
                            toast({
                              title: "Invoice Rejected",
                              description: `Invoice ${sampleInvoiceData.invoiceNumber} has been rejected.`,
                              variant: "destructive",
                            })
                            setSelectedInvoiceId(null)
                          },
                          (userId) => {
                            // Delegate action
                            toast({
                              title: "Invoice Delegated",
                              description: `Invoice ${sampleInvoiceData.invoiceNumber} has been delegated based on AI recommendation.`,
                              className: "bg-blue-50 border-blue-200 text-blue-800",
                            })
                            setSelectedInvoiceId(null)
                          },
                          () => {
                            // Hold action
                            toast({
                              title: "Invoice On Hold",
                              description: `Invoice ${sampleInvoiceData.invoiceNumber} has been placed on hold for review.`,
                              className: "bg-amber-50 border-amber-200 text-amber-800",
                            })
                            setSelectedInvoiceId(null)
                          },
                          () => {
                            // Contact vendor action - open email composer
                            setShowEmailComposer(true)
                          }
                        )}
                        onActionClick={(action) => {
                          console.log('AI Action executed:', action.label)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>


              {/* Tabs */}
              <Tabs defaultValue="header" className="w-full">
                <TabsList className="h-auto p-0 bg-transparent border-b border-gray-200 rounded-none w-full justify-start">
                  <TabsTrigger 
                    value="header" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Header
                  </TabsTrigger>
                  <TabsTrigger 
                    value="line-items" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Line Items
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comments" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 relative"
                  >
                    Comments
                    <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-violet-600 bg-white border border-violet-300 rounded-full">
                      {comments.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="mt-6 space-y-6">
                  {/* Invoice Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center">
                    <Receipt className="h-3 w-3 text-violet-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Invoice Number</div>
                    <div className="font-medium">{sampleInvoiceData.invoiceNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Invoice Date</div>
                    <div className="font-medium">{sampleInvoiceData.invoiceDate}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">Vendor</div>
                    <div className="font-medium">Office Supplies Co.</div>
                  </div>
                </div>
              </div>


              {/* Financial Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center">
                    <DollarSign className="h-3 w-3 text-violet-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financial Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Subtotal</div>
                    <div className="font-medium">{sampleInvoiceData.subtotal}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Currency</div>
                    <div className="font-medium">{sampleInvoiceData.currency}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Tax Amount</div>
                    <div className="font-medium">{sampleInvoiceData.taxAmount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Tax Rate</div>
                    <div className="font-medium">{sampleInvoiceData.taxRate}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Total Amount</div>
                    <div className="font-medium">{sampleInvoiceData.totalAmount}</div>
                  </div>
                </div>
              </div>


              {/* Payment Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center">
                    <CreditCard className="h-3 w-3 text-violet-600" />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Payment Method</div>
                    <div className="font-medium">{sampleInvoiceData.paymentMethod}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Payment Terms</div>
                    <div className="font-medium">{sampleInvoiceData.paymentTerms}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">Billing Address</div>
                    <div className="font-medium">{sampleInvoiceData.billingAddress}</div>
                  </div>
                </div>
              </div>


                </TabsContent>

                <TabsContent value="line-items" className="mt-6 space-y-4">
                  {/* Line Items */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center">
                        <FileText className="h-3 w-3 text-violet-600" />
                      </div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</h3>
                    </div>
                    <div className="space-y-2">
                      {sampleInvoiceData.lineItems.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium text-gray-900 flex-1 pr-2">
                              {item.description}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              €{item.amount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Qty: {item.quantity}</span>
                            <span>Unit Price: €{item.unitPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-6 space-y-4">
                  {/* Comment Input */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900">Add Comment</h3>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-white">JD</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Add a comment about this invoice..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[80px] resize-none border-gray-200 focus:border-violet-300 focus:ring-violet-200"
                        />
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            className="bg-violet-600 hover:bg-violet-700"
                            disabled={!newComment.trim()}
                            onClick={() => {
                              if (newComment.trim()) {
                                toast({
                                  title: "Comment Added",
                                  description: "Your comment has been added to the invoice.",
                                })
                                setNewComment('')
                              }
                            }}
                          >
                            <Send className="h-3 w-3 mr-2" />
                            Post Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <Users className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900">Discussion ({comments.length})</h3>
                    </div>
                    
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full ${comment.color} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-xs font-medium text-white">{comment.initials}</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                            <span className="text-xs text-gray-500">{comment.role}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{comment.timestamp}</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-800 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
      </>

      {/* Team Workload Drawer */}
      {userRole === 'admin' && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 z-40 transition-opacity duration-300 ease-in-out ${
              showTeamWorkloadDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setShowTeamWorkloadDrawer(false)}
          />
          
          {/* Drawer */}
          <div className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 transform transition-all duration-300 ease-in-out flex flex-col ${
            showTeamWorkloadDrawer ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Team Workload</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTeamWorkloadDrawer(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search and Summary Stats */}
            <div className="px-3 pt-3 pb-0 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              {/* Search and Filter Bar */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search team members..."
                    className="pl-10 bg-white border-gray-200 focus:border-violet-300 focus:ring-violet-200"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={`h-10 w-10 relative ${
                        Object.values(teamFilterOptions).some(filter => filter !== 'all')
                          ? 'bg-violet-50 border-violet-200 hover:border-violet-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Filter className={`h-4 w-4 ${
                        Object.values(teamFilterOptions).some(filter => filter !== 'all')
                          ? 'text-violet-600' 
                          : 'text-gray-600'
                      }`} />
                      {Object.values(teamFilterOptions).some(filter => filter !== 'all') && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full"></div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Status Filter */}
                    <div className="px-2 py-1.5">
                      <div className="text-xs font-medium text-gray-500 mb-2">Status</div>
                      <div className="space-y-1">
                        {[
                          { value: 'all', label: 'All Members' },
                          { value: 'available', label: 'Available' },
                          { value: 'busy', label: 'Busy' },
                          { value: 'out-of-office', label: 'Out of Office' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setTeamFilterOptions(prev => ({ ...prev, status: option.value }))}
                            className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 ${
                              teamFilterOptions.status === option.value ? 'bg-violet-50 text-violet-700' : 'text-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 my-1" />
                    
                    {/* Workload Level Filter */}
                    <div className="px-2 py-1.5">
                      <div className="text-xs font-medium text-gray-500 mb-2">Workload Level</div>
                      <div className="space-y-1">
                        {[
                          { value: 'all', label: 'All Levels' },
                          { value: 'underloaded', label: 'Light Load (<70%)' },
                          { value: 'balanced', label: 'Balanced (70-89%)' },
                          { value: 'overloaded', label: 'Overloaded (90%+)' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setTeamFilterOptions(prev => ({ ...prev, workloadLevel: option.value }))}
                            className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 ${
                              teamFilterOptions.workloadLevel === option.value ? 'bg-violet-50 text-violet-700' : 'text-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 my-1" />
                    
                    {/* SLA Performance Filter */}
                    <div className="px-2 py-1.5">
                      <div className="text-xs font-medium text-gray-500 mb-2">SLA Performance</div>
                      <div className="space-y-1">
                        {[
                          { value: 'all', label: 'All Performance' },
                          { value: 'high', label: 'High (95%+)' },
                          { value: 'medium', label: 'Medium (85-94%)' },
                          { value: 'low', label: 'Low (<85%)' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setTeamFilterOptions(prev => ({ ...prev, slaPerformance: option.value }))}
                            className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 ${
                              teamFilterOptions.slaPerformance === option.value ? 'bg-violet-50 text-violet-700' : 'text-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 my-1" />
                    
                    {/* Clear Filters */}
                    <div className="px-2 py-1.5">
                      <button
                        onClick={() => setTeamFilterOptions({
                          status: 'all',
                          workloadLevel: 'all',
                          slaPerformance: 'all',
                          department: 'all'
                        })}
                        className="w-full text-left px-2 py-1 rounded text-sm text-gray-500 hover:bg-gray-100"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Sleek Team Status Overview */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between mb-4 bg-white rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-help">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">
                            {teamWorkloadData.filter(m => m.status === 'available').length}
                          </span>
                          <span className="text-xs text-gray-500">Available</span>
                        </div>
                        
                        <div className="w-px h-4 bg-gray-200"></div>
                        
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">
                            {teamWorkloadData.filter(m => m.status === 'busy').length}
                          </span>
                          <span className="text-xs text-gray-500">Busy</span>
                        </div>
                        
                        <div className="w-px h-4 bg-gray-200"></div>
                        
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">
                            {teamWorkloadData.filter(m => m.status === 'out-of-office').length}
                          </span>
                          <span className="text-xs text-gray-500">OOO</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {Math.round((teamWorkloadData.reduce((sum, m) => sum + m.currentWorkload.pending, 0) / teamWorkloadData.reduce((sum, m) => sum + m.capacity, 0)) * 100)}%{' '}
                            <span className="text-xs text-gray-500 font-normal">capacity</span>
                          </div>
                        </div>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-violet-500 transition-all"
                            style={{ width: `${Math.min((teamWorkloadData.reduce((sum, m) => sum + m.currentWorkload.pending, 0) / teamWorkloadData.reduce((sum, m) => sum + m.capacity, 0)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <div className="space-y-2">
                      <div className="font-semibold text-sm">Team Workload Details</div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="font-medium text-green-600">Available ({teamWorkloadData.filter(m => m.status === 'available').length})</div>
                          <div className="text-gray-600">
                            Avg load: {Math.round(teamWorkloadData.filter(m => m.status === 'available').reduce((sum, m) => sum + (m.currentWorkload.pending / m.capacity * 100), 0) / Math.max(teamWorkloadData.filter(m => m.status === 'available').length, 1))}%
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-amber-600">Busy ({teamWorkloadData.filter(m => m.status === 'busy').length})</div>
                          <div className="text-gray-600">
                            Avg load: {Math.round(teamWorkloadData.filter(m => m.status === 'busy').reduce((sum, m) => sum + (m.currentWorkload.pending / m.capacity * 100), 0) / Math.max(teamWorkloadData.filter(m => m.status === 'busy').length, 1))}%
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2 text-xs">
                        <div className="flex justify-between">
                          <span>Total pending approvals:</span>
                          <span className="font-medium">{teamWorkloadData.reduce((sum, m) => sum + m.currentWorkload.pending, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total team capacity:</span>
                          <span className="font-medium">{teamWorkloadData.reduce((sum, m) => sum + m.capacity, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg processing time:</span>
                          <span className="font-medium">{Math.round((teamWorkloadData.reduce((sum, m) => sum + m.avgApprovalTime, 0) / teamWorkloadData.length) * 10) / 10}h</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Team Members List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {getFilteredTeamMembers().map((member) => {
                  const workloadPercentage = Math.round((member.currentWorkload.pending / member.capacity) * 100)
                  const totalActive = member.currentWorkload.pending + member.currentWorkload.inProgress
                  
                  return (
                    <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                      {/* Compact Header */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-8 h-8 ${member.color} rounded-full flex items-center justify-center text-white text-xs font-semibold`}>
                            {member.initials}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            member.status === 'available' ? 'bg-green-500' : 
                            member.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{member.name}</div>
                              <div className="text-xs text-gray-500 truncate">{member.role}</div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-sm font-medium text-gray-900">{totalActive}/{member.capacity}</div>
                              <div className="text-xs text-gray-500">{workloadPercentage}%</div>
                            </div>
                          </div>
                          
                          {/* Compact Progress Bar */}
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${
                                workloadPercentage >= 90 ? 'bg-red-500' :
                                workloadPercentage >= 70 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                            />
                          </div>
                          
                          {/* Improved Bottom Row with Tooltips */}
                          <div className="flex items-center justify-between mt-3">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              member.status === 'available' ? 'bg-green-100 text-green-700' :
                              member.status === 'busy' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {member.status === 'available' ? 'Available' :
                               member.status === 'busy' ? 'Busy' : 'OOO'}
                            </span>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <span>{member.currentWorkload.pending} Pend.</span>
                                      <span>{member.currentWorkload.inProgress} Active</span>
                                      <span>{member.currentWorkload.completedToday} Done</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <div>{member.currentWorkload.pending} Pending approvals</div>
                                      <div>{member.currentWorkload.inProgress} Currently processing</div>
                                      <div>{member.currentWorkload.completedToday} Completed today</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <span className="text-gray-400">•</span>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">{member.avgApprovalTime}h avg</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      Average processing time from assignment to completion: {member.avgApprovalTime} hours
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              
              {/* No Results Message */}
              {getFilteredTeamMembers().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <div className="text-sm">No team members found</div>
                  <div className="text-xs">
                    {teamSearchQuery || Object.values(teamFilterOptions).some(filter => filter !== 'all') 
                      ? 'Try adjusting your search terms or filters' 
                      : 'No team members available'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bulk Assignment Drawer */}
      {userRole === 'admin' && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-all duration-300 ease-in-out ${
              showBulkAssignmentDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setShowBulkAssignmentDrawer(false)}
          />
          
          {/* Drawer */}
          <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-all duration-300 ease-in-out flex flex-col ${
            showBulkAssignmentDrawer ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Forward className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Bulk Assignment</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowBulkAssignmentDrawer(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 flex-shrink-0">
                {/* Selected Invoices Summary */}
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-violet-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{selectedInvoices.size}</span>
                    </div>
                    <span className="text-sm font-medium text-violet-900">
                      {selectedInvoices.size} invoice{selectedInvoices.size === 1 ? '' : 's'} selected
                    </span>
                  </div>
                  <div className="text-xs text-violet-700">
                    Total value: ${Array.from(selectedInvoices).reduce((sum, id) => {
                      const allInvoices = [...pendingApprovals, ...onHoldApprovals, ...overdueApprovals, ...approvedToday, ...rejectedApprovals, ...approvedThisMonth]
                      const invoice = allInvoices.find(inv => inv.id === id)
                      return sum + (invoice?.totalAmount || 0)
                    }, 0).toLocaleString()}
                  </div>
                </div>

                {/* Assignment Strategy */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-900">Assignment Strategy</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setAssignmentStrategy('direct')
                        setAssignmentPreview([])
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        assignmentStrategy === 'direct' 
                          ? 'border-violet-600 bg-violet-50 text-violet-900' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">Direct</div>
                      <div className="text-xs text-gray-500">Assign to specific user</div>
                    </button>
                    <button
                      onClick={() => {
                        setAssignmentStrategy('round-robin')
                        setAssignmentPreview([])
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        assignmentStrategy === 'round-robin' 
                          ? 'border-violet-600 bg-violet-50 text-violet-900' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">Round Robin</div>
                      <div className="text-xs text-gray-500">Distribute evenly</div>
                    </button>
                    <button
                      onClick={() => {
                        setAssignmentStrategy('load-balance')
                        setAssignmentPreview([])
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        assignmentStrategy === 'load-balance' 
                          ? 'border-violet-600 bg-violet-50 text-violet-900' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">Load Balance</div>
                      <div className="text-xs text-gray-500">Based on workload</div>
                    </button>
                    <button
                      onClick={() => {
                        setAssignmentStrategy('ai-smart')
                        setAssignmentPreview([])
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        assignmentStrategy === 'ai-smart' 
                          ? 'border-violet-600 bg-violet-50 text-violet-900' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium">AI Smart</div>
                      <div className="text-xs text-gray-500">Intelligent matching</div>
                    </button>
                  </div>
                </div>

                {/* Direct Assignment - User Selection */}
                {assignmentStrategy === 'direct' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">Select Assignee</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-left font-normal">
                          {selectedAssignee ? (
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${selectedAssignee.color}`}>
                                {selectedAssignee.initials}
                              </div>
                              <span>{selectedAssignee.name}</span>
                              <span className="text-gray-500">• {selectedAssignee.role}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Search and select team member...</span>
                          )}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[368px] p-2">
                        <div className="relative mb-2">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="search"
                            placeholder="Search team members..."
                            className="pl-8 h-8"
                            value={bulkAssignmentSearchQuery}
                            onChange={(e) => setBulkAssignmentSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {assigneeOptions
                            .filter(assignee => 
                              assignee.name.toLowerCase().includes(bulkAssignmentSearchQuery.toLowerCase()) ||
                              assignee.role.toLowerCase().includes(bulkAssignmentSearchQuery.toLowerCase())
                            )
                            .map((assignee) => (
                              <DropdownMenuItem
                                key={assignee.id}
                                onClick={() => {
                                  setSelectedAssignee(assignee)
                                  setBulkAssignmentSearchQuery('')
                                }}
                                className="cursor-pointer p-2"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${assignee.color}`}>
                                    {assignee.initials}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{assignee.name}</div>
                                    <div className="text-xs text-gray-500">{assignee.role}</div>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {assignee.currentWorkload} active
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

              </div>
              
              {/* Preview Section - Full Height */}
              {assignmentPreview.length > 0 && (
                <div className="flex-1 flex flex-col px-6 pb-6 overflow-hidden">
                  <Label className="text-sm font-medium text-gray-900 mb-3 flex-shrink-0">Assignment Preview</Label>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {assignmentPreview.map((preview) => (
                      <div key={preview.invoiceId} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">
                            Invoice {(() => {
                              const allInvoices = [...pendingApprovals, ...onHoldApprovals, ...overdueApprovals, ...approvedToday, ...rejectedApprovals, ...approvedThisMonth]
                              return allInvoices.find(inv => inv.id === preview.invoiceId)?.invoiceNumber
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${preview.assignedTo.color}`}>
                              {preview.assignedTo.initials}
                            </div>
                            <span className="text-xs text-gray-600">{preview.assignedTo.name}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{preview.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white flex-shrink-0">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Generate preview based on strategy
                    const selectedInvoiceIds = Array.from(selectedInvoices)
                    const newPreview: Array<{invoiceId: string, assignedTo: typeof assigneeOptions[0], reason: string}> = []
                    
                    if (assignmentStrategy === 'direct') {
                      // Direct assignment - all to selected user
                      selectedInvoiceIds.forEach(invoiceId => {
                        newPreview.push({
                          invoiceId,
                          assignedTo: selectedAssignee || assigneeOptions[0],
                          reason: 'Direct assignment to selected team member'
                        })
                      })
                    } else if (assignmentStrategy === 'round-robin') {
                      // Round Robin - distribute evenly
                      const availableAssignees = assigneeOptions.filter(a => a.currentWorkload < 10)
                      selectedInvoiceIds.forEach((invoiceId, index) => {
                        const assignee = availableAssignees[index % availableAssignees.length]
                        newPreview.push({
                          invoiceId,
                          assignedTo: assignee,
                          reason: `Round-robin distribution (position ${(index % availableAssignees.length) + 1}/${availableAssignees.length})`
                        })
                      })
                    } else if (assignmentStrategy === 'load-balance') {
                      // Load Balance - assign to least busy
                      const sortedByWorkload = [...assigneeOptions].sort((a, b) => a.currentWorkload - b.currentWorkload)
                      const workloadMap = new Map(sortedByWorkload.map(a => [a.id, a.currentWorkload]))
                      
                      selectedInvoiceIds.forEach(invoiceId => {
                        // Find person with lowest current workload
                        const lowestWorkload = Math.min(...Array.from(workloadMap.values()))
                        const assignee = sortedByWorkload.find(a => workloadMap.get(a.id) === lowestWorkload) || sortedByWorkload[0]
                        
                        newPreview.push({
                          invoiceId,
                          assignedTo: assignee,
                          reason: `Load-balanced assignment (${workloadMap.get(assignee.id)} current tasks, ${Math.round((workloadMap.get(assignee.id)! / 10) * 100)}% capacity)`
                        })
                        
                        // Update workload for next iteration
                        workloadMap.set(assignee.id, (workloadMap.get(assignee.id) || 0) + 1)
                      })
                    } else if (assignmentStrategy === 'ai-smart') {
                      // AI Smart - intelligent matching based on various factors
                      const allInvoices = [...pendingApprovals, ...onHoldApprovals, ...overdueApprovals]
                      
                      selectedInvoiceIds.forEach(invoiceId => {
                        const invoice = allInvoices.find(inv => inv.id === invoiceId)
                        let assignee: typeof assigneeOptions[0]
                        let reason: string
                        
                        if (invoice) {
                          // Match based on category/amount
                          if (invoice.totalAmount > 5000) {
                            // High value - assign to senior staff
                            assignee = assigneeOptions.find(a => a.role.includes('Director') || a.role.includes('CFO')) || assigneeOptions[3]
                            reason = `High-value invoice ($${invoice.totalAmount.toLocaleString()}) - assigned to senior approver`
                          } else if (invoice.spendCategory === 'Office Supplies') {
                            // Office supplies - assign to AP specialist
                            assignee = assigneeOptions.find(a => a.role === 'AP Specialist') || assigneeOptions[1]
                            reason = `Category expertise match: ${invoice.spendCategory} specialist`
                          } else if (invoice.supplierName.includes('Tech')) {
                            // Tech vendor - assign to someone familiar
                            assignee = assigneeOptions[2]
                            reason = `Vendor relationship: Previously handled ${invoice.supplierName} invoices`
                          } else {
                            // Default intelligent assignment
                            const workloadScore = assigneeOptions.map(a => ({
                              assignee: a,
                              score: (10 - a.currentWorkload) * 0.5 + (a.role.includes('Manager') ? 2 : 0)
                            })).sort((a, b) => b.score - a.score)
                            assignee = workloadScore[0].assignee
                            reason = `AI optimization: Best match based on workload and expertise`
                          }
                        } else {
                          assignee = assigneeOptions[0]
                          reason = 'AI-powered assignment based on current capacity'
                        }
                        
                        newPreview.push({ invoiceId, assignedTo: assignee, reason })
                      })
                    }
                    
                    setAssignmentPreview(newPreview)
                  }}
                  className="flex-1"
                  disabled={selectedInvoices.size === 0 || (assignmentStrategy === 'direct' && !selectedAssignee)}
                >
                  Generate Preview
                </Button>
                <Button
                  onClick={() => {
                    // Execute assignment logic here
                    toast({
                      title: "Assignment Successful",
                      description: `${selectedInvoices.size} invoice${selectedInvoices.size === 1 ? '' : 's'} assigned successfully.`,
                      className: "bg-green-50 border-green-200 text-green-800",
                    })
                    setShowBulkAssignmentDrawer(false)
                    setSelectedInvoices(new Set())
                    setAssignmentPreview([])
                  }}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                  disabled={selectedInvoices.size === 0 || assignmentPreview.length === 0}
                >
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Email Composer for Contact Vendor Action */}
      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        onSend={(emailData) => {
          // Handle email sending
          toast({
            title: "Email Sent Successfully",
            description: `Vendor inquiry sent to ${emailData.to}. Recommendation marked as completed.`,
            className: "bg-green-50 border-green-200 text-green-800",
          })
          
          // Close the email composer and invoice drawer
          setShowEmailComposer(false)
          setSelectedInvoiceId(null)
        }}
        invoiceData={{
          invoiceNumber: sampleInvoiceData.invoiceNumber,
          vendor: sampleInvoiceData.vendor,
          amount: 4086.10,
          poNumber: sampleInvoiceData.purchaseOrderNumber,
          discrepancies: [
            "Amount variance: Invoice shows €4,086.10 vs PO amount of €4,000.00 (+2.2%)",
            "Line item: Desk Organizer Set quantity (8 vs 5 on PO)"
          ]
        }}
        vendorContact={{
          email: "orders@woodpecker-supplies.com",
          name: "Vendor Contact",
          phone: "+1 (555) 123-4567"
        }}
      />
    </div>
  )
}