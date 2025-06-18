'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import MainHeader from '@/components/main-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Users, Clock, CheckCircle, Calendar, Pause, AlertTriangle, ChevronDown, Plus, Settings, User, UserX, RotateCcw, FileText, Inbox, PartyPopper, Sparkles, Search, Filter, ArrowRight, Forward, Receipt, Eye, CreditCard, DollarSign } from 'lucide-react'
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
    { initials: 'SC', name: 'Sarah Chen', role: 'AP Manager', color: 'bg-violet-500' },
    { initials: 'MJ', name: 'Michael Johnson', role: 'AP Specialist', color: 'bg-blue-500' },
    { initials: 'AR', name: 'Anna Rodriguez', role: 'Finance Director', color: 'bg-green-500' },
    { initials: 'DK', name: 'David Kim', role: 'CFO', color: 'bg-amber-500' },
    { initials: 'LP', name: 'Lisa Park', role: 'Senior Accountant', color: 'bg-purple-500' },
    { initials: 'JW', name: 'John Wilson', role: 'Department Head', color: 'bg-red-500' },
    { initials: 'KB', name: 'Karen Brown', role: 'Legal Counsel', color: 'bg-indigo-500' }
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
    lineItems: [
      { id: 1, description: 'Office Paper A4 - 500 sheets', quantity: 25, unitPrice: 12.50, amount: 312.50 },
      { id: 2, description: 'Blue Ink Pens - Pack of 12', quantity: 15, unitPrice: 8.75, amount: 131.25 },
      { id: 3, description: 'Stapler Heavy Duty', quantity: 5, unitPrice: 24.00, amount: 120.00 },
      { id: 4, description: 'Desk Organizer Set', quantity: 8, unitPrice: 45.50, amount: 364.00 },
      { id: 5, description: 'Whiteboard Markers - Set of 8', quantity: 12, unitPrice: 15.25, amount: 183.00 }
    ]
  }

  const handleInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
  }

  const handleCloseInvoice = () => {
    setSelectedInvoiceId(null)
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

  // Handle role change
  const handleRoleChange = (isAdmin: boolean) => {
    setUserRole(isAdmin ? 'admin' : 'user')
    setTimeout(initializeAssignments, 0) // Initialize after state update
  }

  // Initialize assignments on component mount
  useEffect(() => {
    initializeAssignments()
  }, [userRole])

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
      approverName: 'John Doe'
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
      approverName: 'John Doe'
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
      approverName: 'John Doe'
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
    let baseColumns = 9 // Invoice#, Date, Supplier, Amount, Due, Status, Category, GL, Dept
    
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
      case 'overdue':
        return {
          icon: <CheckCircle className="h-12 w-12 text-green-400" />,
          title: "No overdue invoices!",
          description: "Great job keeping up with approvals. All invoices are being processed on time.",
          actionLabel: "Check Pending",
          actionView: 'pending' as ViewType
        }
      case 'on-hold':
        return {
          icon: <Inbox className="h-12 w-12 text-orange-400" />,
          title: "No invoices on hold",
          description: "All invoices have the information needed to proceed with approval.",
          actionLabel: "View Pending",
          actionView: 'pending' as ViewType
        }
      case 'approved-today':
        return {
          icon: <Calendar className="h-12 w-12 text-blue-400" />,
          title: "No approvals yet today",
          description: "You haven't approved any invoices today. Check your pending items to get started.",
          actionLabel: "View Pending",
          actionView: 'pending' as ViewType
        }
      case 'rejected':
        return {
          icon: <CheckCircle className="h-12 w-12 text-gray-400" />,
          title: "No rejected invoices",
          description: "All submitted invoices are in good standing with no issues found.",
          actionLabel: "View All",
          actionView: 'all' as ViewType
        }
      case 'approved-month':
        return {
          icon: <Calendar className="h-12 w-12 text-blue-400" />,
          title: "No approvals this month",
          description: "You haven't approved any invoices this month yet.",
          actionLabel: "Check Pending",
          actionView: 'pending' as ViewType
        }
      case 'delegated':
        return {
          icon: <Users className="h-12 w-12 text-orange-400" />,
          title: "No delegated invoices",
          description: "You haven't delegated any invoices to other team members.",
          actionLabel: "View Pending",
          actionView: 'pending' as ViewType
        }
      case 'all':
        return {
          icon: <Inbox className="h-12 w-12 text-blue-400" />,
          title: "No invoices found",
          description: "There are no invoices in the system at this time.",
          actionLabel: null,
          actionView: null
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MainHeader activePage="approvals" sidebarContext="invoices" />
        
        <main className="flex-1 overflow-auto bg-gray-50/50 min-w-0">
          <div className="p-6 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">
                {userRole === 'user' ? 'My Approvals' : 'Team Approvals'}
              </h1>
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
                  <Table style={needsHorizontalScroll ? { minWidth: '1200px', width: '1200px' } : {}} className={needsHorizontalScroll ? '' : 'w-full'}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Invoice Number</TableHead>
                      <TableHead className="whitespace-nowrap">Invoice Date</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      {activeView === 'overdue' && <TableHead className="whitespace-nowrap">Days Overdue</TableHead>}
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
                        <TableCell colSpan={100} className="h-64">
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

      {/* Invoice Preview Drawer */}
      {selectedInvoiceId && (
        <>
          {/* Backdrop - no mask, just for closing */}
          <div 
            className="fixed inset-0 z-40"
            onClick={handleCloseInvoice}
          />
          
          {/* Drawer */}
          <div className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
            selectedInvoiceId ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Invoice Preview</h2>
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
              {/* Hero Section - Compact */}
              <div className="bg-gradient-to-br from-violet-50 to-white p-4 rounded-lg border border-violet-100">
                <div>
                  <div className="text-xs text-gray-600">Total Amount</div>
                  <div className="text-2xl font-semibold text-gray-900">{sampleInvoiceData.totalAmount}</div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      28 days left
                    </div>
                    <span className="text-gray-600">
                      Due <span className="font-medium text-gray-900">{sampleInvoiceData.dueDate}</span>
                    </span>
                  </div>
                </div>
              </div>

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
                    <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium truncate max-w-full">
                      {sampleInvoiceData.vendor}
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-200"></div>

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

              {/* Separator */}
              <div className="border-t border-gray-200"></div>

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

              {/* Separator */}
              <div className="border-t border-gray-200"></div>

              {/* Line Items */}
              <div className="space-y-3 pt-2">
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
            </div>
          </div>
        </>
      )}
    </div>
  )
}