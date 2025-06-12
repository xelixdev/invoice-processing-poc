"use client"

import React, { useState, useEffect, useRef } from "react"
import { ArrowLeft, FileText, Edit, Plus, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Maximize, X, Receipt, FileCheck, TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Calendar as CalendarIcon, Copy, List, MoreVertical, MessageCircle, Save, XIcon, Clock, Info, Check, Send, UserCheck, CreditCard, Link as LinkIcon, Eye, Shield, FileImage, Package, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetHeader, SheetTitle, SheetTrigger, SheetPortal, SheetClose } from "@/components/ui/sheet"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import Sidebar from "@/components/sidebar"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { LineItemSelector } from "@/components/line-item-selector"
import { useInvoiceValidation, validationRules } from "@/hooks/use-invoice-validation"
import { parseMatchingValidation, getFieldMatchStatus, getFieldMatchResult, getMatchingSummary } from "@/lib/validation/matching-parser"
import { runCrossFieldValidations, calculateExpectedValues, crossFieldValidationRules } from "@/lib/validation/cross-field-validation"

interface InvoiceData {
  document_type: string;
  invoices: Invoice[];
}

interface Invoice {
  invoice_number: string;
  po_number: string;
  amount: number;
  subtotal?: number;
  tax_amount: number;
  tax_rate?: number;
  currency_code: string;
  date: string;
  due_date: string;
  payment_term_days: string;
  vendor: string;
  vendor_status?: string;
  payment_history?: string;
  billing_address?: string;
  payment_method?: string;
  bank_details?: string;
  spend_category?: string;
  unspsc_code?: string;
  budget_status?: string;
  budget_impact?: string;
  line_items: LineItem[];
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

import type { ValidationIssue as ValidationIssueType } from "@/hooks/use-invoice-validation"

// Extend the validation issue type if needed for UI-specific properties
interface ValidationIssue extends ValidationIssueType {
  // Additional UI-specific properties can go here
}

const workflowStages = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  validation: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  processing: { label: 'Processing Payment', color: 'bg-purple-100 text-purple-700', icon: TrendingUp },
  paid: { label: 'Paid', color: 'bg-gray-100 text-gray-700', icon: Check }
}

const assigneeOptions = [
  { initials: 'SC', name: 'Sarah Chen', role: 'AP Manager', color: 'bg-violet-500' },
  { initials: 'MJ', name: 'Michael Johnson', role: 'AP Specialist', color: 'bg-blue-500' },
  { initials: 'AR', name: 'Anna Rodriguez', role: 'Finance Director', color: 'bg-green-500' },
  { initials: 'DK', name: 'David Kim', role: 'AP Clerk', color: 'bg-amber-500' },
  { initials: 'LP', name: 'Lisa Park', role: 'Senior Accountant', color: 'bg-purple-500' }
]

// Define validation rules for invoice fields
// Note: Field names must match the fieldName prop in EditableField components
const invoiceFieldValidation = {
  // Basic invoice fields
  invoiceNumber: [
    validationRules.required('Invoice number is required'),
    validationRules.pattern(/^[A-Z0-9-]+$/i, 'Invoice number must contain only letters, numbers, and hyphens')
  ],
  vendor: [
    validationRules.required('Vendor is required'),
    validationRules.minLength(2, 'Vendor name must be at least 2 characters')
  ],
  
  // Amount fields (with cross-field validation)
  amount: [
    validationRules.required('Total amount is required'),
    validationRules.minAmount(0.01, 'Amount must be greater than 0'),
    crossFieldValidationRules.totalCalculation()
  ],
  subtotalAmount: [
    validationRules.minAmount(0, 'Subtotal must be non-negative'),
    crossFieldValidationRules.lineItemsTotal()
  ],
  taxAmount: [
    validationRules.required('Tax amount is required'),
    validationRules.minAmount(0, 'Tax amount must be non-negative')
  ],
  
  // Date fields (with cross-field validation)
  date: [
    validationRules.required('Invoice date is required')
  ],
  dueDate: [
    validationRules.required('Due date is required'),
    validationRules.futureDate('Due date should be in the future'),
    crossFieldValidationRules.dueDateAfterInvoiceDate()
  ],
  
  // Payment fields (with cross-field validation)
  paymentTerms: [
    validationRules.required('Payment terms are required'),
    crossFieldValidationRules.paymentTermsMatchDueDate()
  ],
  currency: [
    validationRules.required('Currency is required')
  ],
  
  // Additional fields that could be validated
  billingAddress: [
    validationRules.minLength(10, 'Please provide a complete billing address')
  ],
  paymentMethod: [
    validationRules.required('Payment method is required')
  ],
  
  // GL Account and Spend Category - required only for non-PO invoices
  glAccount: [
    {
      type: 'custom' as const,
      severity: 'error' as const,
      message: 'GL Account / Cost Center is required for non-PO invoices',
      validate: (value: any, formData?: any) => {
        // If PO-backed, field is not required
        const isPOBacked = !!(formData?.po_number || linkedPO || matchingData?.matched_po)
        if (isPOBacked) return true
        
        // For non-PO invoices, field is required
        return value && value.trim().length > 0
      }
    }
  ],
  spendCategory: [
    {
      type: 'custom' as const,
      severity: 'error' as const,
      message: 'Spend Category is required for non-PO invoices',
      validate: (value: any, formData?: any) => {
        // If PO-backed, field is not required
        const isPOBacked = !!(formData?.po_number || linkedPO || matchingData?.matched_po)
        if (isPOBacked) return true
        
        // For non-PO invoices, field is required
        return value && value.trim().length > 0
      }
    }
  ]
}

export default function InvoiceDetailsPage() {
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [linkedPO, setLinkedPO] = useState<string | null>(null)
  const [linkedGR, setLinkedGR] = useState<string | null>(null)
  const [validationIssues, setValidationIssues] = useState<{[key: string]: ValidationIssue[]}>({}) // Keep for backward compatibility
  const [isIssuesDrawerOpen, setIsIssuesDrawerOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<{[key: string]: string}>({})
  const [removingVendor, setRemovingVendor] = useState(false)
  const [resolvingIssues, setResolvingIssues] = useState<Set<string>>(new Set())
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set())
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null)
  const [lineItemValues, setLineItemValues] = useState<{[key: number]: Partial<LineItem>}>({})
  const [forcedMatchedItems, setForcedMatchedItems] = useState<Set<number>>(new Set())
  const [budgetSectionExpanded, setBudgetSectionExpanded] = useState(true)
  const [workflowStage, setWorkflowStage] = useState<'draft' | 'validation' | 'pending_approval' | 'approved' | 'processing' | 'paid'>('validation')
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false)
  const [currentAssignee, setCurrentAssignee] = useState('SC')
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const descriptionInputRefs = useRef<{[key: number]: HTMLInputElement | null}>({})
  
  // Initialize the validation hook
  const validation = useInvoiceValidation({
    validationRules: invoiceFieldValidation,
    initialData: invoice
  })

  // Mock GR line items for matching (keeping only GR for now)
  const mockGRLines = [
    { id: "GR-001-1", description: "Professional consulting services", quantity: 10 },
    { id: "GR-001-2", description: "Software development services", quantity: 8 },
    { id: "GR-001-3", description: "Project management services", quantity: 5 },
  ]

  // Line item matching state
  const [lineItemMatches, setLineItemMatches] = useState<{[key: number]: {poLineId?: string, grLineId?: string}}>({})
  
  // Mock comment data for some line items
  const mockComments: {[key: number]: number} = {
    0: 2, // First line item has 2 comments
    2: 1  // Third line item has 1 comment
  }
  
  // Line item status calculation
  const getLineItemStatus = (itemIndex: number) => {
    // Check if this item is forced to be matched
    if (forcedMatchedItems.has(itemIndex)) {
      return 'matched'
    }
    
    const match = lineItemMatches[itemIndex]
    if (!match?.poLineId) return 'missing'
    
    const invoiceItem = invoice?.line_items[itemIndex]
    // TODO: Get PO line items from backend matching data
    const poLine = null // mockPOLines.find(po => po.id === match.poLineId)
    
    if (!poLine || !invoiceItem) return 'missing'
    
    // Check for mismatches
    if (Math.abs(invoiceItem.quantity - poLine.quantity) > 0.1 || 
        Math.abs(invoiceItem.unit_price - poLine.unit_price) > 0.01) {
      return 'mismatch'
    }
    
    return 'matched'
  }

  // Handle line item editing
  const handleEditLineItem = (index: number) => {
    if (!invoice?.line_items || !invoice.line_items[index]) {
      console.error('Cannot edit line item: item not found at index', index)
      return
    }
    
    setEditingLineItem(index)
    // Initialize editing values with current line item data
    const currentItem = invoice.line_items[index]
    setLineItemValues(prev => ({
      ...prev,
      [index]: {
        description: currentItem.description,
        quantity: currentItem.quantity,
        unit_price: currentItem.unit_price,
        total: currentItem.total
      }
    }))
    
    // Focus the description input after state update
    setTimeout(() => {
      descriptionInputRefs.current[index]?.focus()
    }, 0)
  }

  const handleLineItemValueChange = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItemValues(prev => {
      const updated = {
        ...prev,
        [index]: {
          ...prev[index],
          [field]: value
        }
      }
      
      // Auto-calculate total if quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? Number(value) : Number(updated[index]?.quantity || 0)
        const unitPrice = field === 'unit_price' ? Number(value) : Number(updated[index]?.unit_price || 0)
        updated[index] = {
          ...updated[index],
          total: quantity * unitPrice
        }
      }
      
      return updated
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveLineItem(index)
    }
  }

  const handleMarkAsMatched = (index: number) => {
    setForcedMatchedItems(prev => new Set(prev).add(index))
  }

  const handleResetForcedMatches = () => {
    setForcedMatchedItems(new Set())
  }

  const handleSaveLineItem = (index: number) => {
    const editedValues = lineItemValues[index]
    if (!editedValues || !invoice?.line_items || !invoice.line_items[index]) {
      console.error('Cannot save line item: invalid data')
      return
    }
    
    // Update the invoice data
    const updatedLineItems = [...invoice.line_items]
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      ...editedValues
    }
    
    setInvoice(prev => prev ? {
      ...prev,
      line_items: updatedLineItems
    } : prev)
    
    // Reset forced matches when invoice data is edited
    handleResetForcedMatches()
    
    setEditingLineItem(null)
    setLineItemValues(prev => {
      const { [index]: removed, ...rest } = prev
      return rest
    })
  }

  const handleCancelEditLineItem = () => {
    setEditingLineItem(null)
    setLineItemValues(prev => {
      if (editingLineItem !== null) {
        const { [editingLineItem]: removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }

  const handleAddLineItem = () => {
    if (!invoice) {
      console.error('Cannot add line item: invoice not loaded')
      return
    }
    
    const newLineItem: LineItem = {
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0
    }
    
    const updatedLineItems = [...invoice.line_items, newLineItem]
    const newIndex = updatedLineItems.length - 1
    
    // Update invoice state
    setInvoice(prev => prev ? {
      ...prev,
      line_items: updatedLineItems
    } : prev)
    
    // Directly set edit state without calling handleEditLineItem
    setEditingLineItem(newIndex)
    setLineItemValues(prev => ({
      ...prev,
      [newIndex]: {
        description: newLineItem.description,
        quantity: newLineItem.quantity,
        unit_price: newLineItem.unit_price,
        total: newLineItem.total
      }
    }))
    
    // Focus the description input for the new line item
    setTimeout(() => {
      descriptionInputRefs.current[newIndex]?.focus()
    }, 0)
  }

  const handleRemoveLineItem = (index: number) => {
    if (!invoice) {
      console.error('Cannot remove line item: invoice not loaded')
      return
    }

    // Remove the line item from the invoice
    const updatedLineItems = invoice.line_items.filter((_, i) => i !== index)
    
    setInvoice(prev => prev ? {
      ...prev,
      line_items: updatedLineItems
    } : prev)

    // Update line item matches - remove the match for this index and shift down higher indices
    setLineItemMatches(prev => {
      const updated = { ...prev }
      
      // Remove the match for the deleted line
      delete updated[index]
      
      // Shift down all matches for indices greater than the deleted one
      Object.keys(updated).forEach(key => {
        const idx = parseInt(key)
        if (idx > index) {
          updated[idx - 1] = updated[idx]
          delete updated[idx]
        }
      })
      
      return updated
    })

    // Update forced matched items - remove and shift indices
    setForcedMatchedItems(prev => {
      const updated = new Set<number>()
      prev.forEach(idx => {
        if (idx < index) {
          updated.add(idx)
        } else if (idx > index) {
          updated.add(idx - 1)
        }
        // Skip idx === index (the deleted item)
      })
      return updated
    })

    // Clear editing state if we were editing the deleted item or an item after it
    if (editingLineItem !== null) {
      if (editingLineItem === index) {
        setEditingLineItem(null)
        setLineItemValues(prev => {
          const { [index]: removed, ...rest } = prev
          return rest
        })
      } else if (editingLineItem > index) {
        setEditingLineItem(editingLineItem - 1)
        // Shift the editing values down
        setLineItemValues(prev => {
          const updated = { ...prev }
          if (prev[editingLineItem]) {
            updated[editingLineItem - 1] = prev[editingLineItem]
            delete updated[editingLineItem]
          }
          return updated
        })
      }
    }
  }

  // Handle line item matching
  const handleLineItemMatch = (itemIndex: number, type: 'po' | 'gr', lineId: string) => {
    setLineItemMatches(prev => {
      const updated = { ...prev }
      
      // If lineId is empty, remove the selection
      if (!lineId) {
        if (updated[itemIndex]) {
          // Remove the specific field but keep other fields if they exist
          const { [type === 'po' ? 'poLineId' : 'grLineId']: removed, ...rest } = updated[itemIndex]
          // If no other fields remain, remove the entire entry
          if (Object.keys(rest).length === 0) {
            delete updated[itemIndex]
          } else {
            updated[itemIndex] = rest
          }
        }
      } else {
        // Set the new selection
        updated[itemIndex] = {
          ...updated[itemIndex],
          [type === 'po' ? 'poLineId' : 'grLineId']: lineId
        }
      }
      
      return updated
    })
  }

  // Calculate line item statistics
  const getLineItemStats = () => {
    if (!invoice?.line_items) return { total: 0, matched: 0, variances: 0, unmatched: 0 }
    
    const stats = { total: 0, matched: 0, variances: 0, unmatched: 0 }
    
    invoice.line_items.forEach((_, index) => {
      stats.total++
      const status = getLineItemStatus(index)
      if (status === 'matched') stats.matched++
      else if (status === 'mismatch') stats.variances++
      else stats.unmatched++
    })
    
    return stats
  }

  // State for matching validation
  const [matchingData, setMatchingData] = useState<any>(null)
  
  useEffect(() => {
    // Retrieve the extracted data from sessionStorage
    const storedData = sessionStorage.getItem("extractedInvoiceData")
    if (storedData) {
      const parsedData = JSON.parse(storedData) as InvoiceData
      setExtractedData(parsedData)
      
      // Set the first invoice as the current one
      if (parsedData.invoices && parsedData.invoices.length > 0) {
        const firstInvoice = parsedData.invoices[0]
        
        // Calculate subtotal if not present
        if (!firstInvoice.subtotal && firstInvoice.amount && firstInvoice.tax_amount) {
          firstInvoice.subtotal = firstInvoice.amount - firstInvoice.tax_amount
        }
        
        setInvoice(firstInvoice)
        
        // Store matching data if available
        if ((firstInvoice as any).matching) {
          setMatchingData((firstInvoice as any).matching)
          console.log('✅ Matching data loaded successfully!')
        } else {
          console.log('⚠️ No matching data found in invoice')
        }
        
        // Initialize linked PO state
        setLinkedPO(firstInvoice.po_number)
        // Do not initialize GR - let user link manually when needed
      }
    }

    // Retrieve the file preview data
    const storedFileData = sessionStorage.getItem("invoiceFileData")
    const storedFileType = sessionStorage.getItem("invoiceFileType")
    const storedFileName = sessionStorage.getItem("invoiceFileName")
    
    if (storedFileData) {
      setFileData(storedFileData)
      setFileType(storedFileType)
      setFileName(storedFileName)
    }
  }, [])

  // Sync validation hook state with existing validation UI
  useEffect(() => {
    // Convert validation hook state to the existing format
    const newValidationIssues: {[key: string]: ValidationIssue[]} = {}
    
    Object.entries(validation.validationState).forEach(([field, issues]) => {
      if (issues.length > 0) {
        newValidationIssues[field] = issues
      }
    })
    
    // Add matching validation if available
    if (matchingData && linkedPO) {
      const matchingIssues = parseMatchingValidation(matchingData, (field, value) => {
        // Quick fix callback
        setFieldValues(prev => ({ ...prev, [field]: value }))
        setEditingField(field)
      })
      
      // Merge matching issues with existing validation
      Object.entries(matchingIssues).forEach(([field, issues]) => {
        if (issues.length > 0) {
          newValidationIssues[field] = [
            ...(newValidationIssues[field] || []),
            ...issues
          ]
        }
      })
    }
    
    // Add cross-field validation
    if (invoice) {
      const crossFieldIssues = runCrossFieldValidations(invoice)
      Object.entries(crossFieldIssues).forEach(([field, issues]) => {
        if (issues.length > 0) {
          newValidationIssues[field] = [
            ...(newValidationIssues[field] || []),
            ...issues
          ]
        }
      })
    }
    
    setValidationIssues(newValidationIssues)
  }, [validation.validationState, matchingData, linkedPO, invoice])
  
  // Remove this entire useEffect - validation is now handled dynamically in the main validation sync useEffect above

  // Helper function to get the most severe issue type for a field
  const getMostSevereIssueType = (fieldIssues: ValidationIssue[]): 'error' | 'warning' | 'info' => {
    if (fieldIssues.some(issue => issue.type === 'error')) return 'error'
    if (fieldIssues.some(issue => issue.type === 'warning')) return 'warning'
    return 'info'
  }

  // Helper function to get field display name
  const getFieldDisplayName = (fieldKey: string): string => {
    const fieldNames: {[key: string]: string} = {
      // Main invoice fields
      invoiceNumber: 'Invoice Number',
      vendor: 'Vendor',
      amount: 'Total Amount',
      subtotalAmount: 'Subtotal',
      taxAmount: 'Tax Amount',
      currency: 'Currency',
      
      // Date fields
      date: 'Invoice Date',
      dueDate: 'Due Date',
      
      // Payment fields
      paymentTerms: 'Payment Terms',
      paymentMethod: 'Payment Method',
      billingAddress: 'Billing Address',
      
      // Additional fields
      spendCategory: 'Spend Category',
      glAccount: 'GL Account',
      
      // Summary fields
      _summary: 'Overall Validation',
      
      // Legacy field names (for backward compatibility)
      invoice_number: 'Invoice Number',
      tax_amount: 'Tax Amount',
      due_date: 'Due Date',
      payment_term_days: 'Payment Terms',
      currency_code: 'Currency'
    }
    return fieldNames[fieldKey] || fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
  }
  
  // Helper function to get PO matching statistics
  const getPOMatchingStats = () => {
    if (!matchingData?.data_comparison?.comparisons) {
      return { matched: 0, total: 0, status: 'unknown' }
    }
    
    const comparisons = matchingData.data_comparison.comparisons
    const fields = ['amount', 'currency', 'payment_terms', 'vendor']
    
    let matched = 0
    let total = 0
    
    fields.forEach(field => {
      if (comparisons[field]) {
        total++
        if (comparisons[field].result === 'perfect_match') {
          matched++
        }
      }
    })
    
    // Add line items if available
    if (invoice?.line_items) {
      total += invoice.line_items.length
      // For now, assume line items are matched if overall status is good
      if (matchingData.match_confidence && matchingData.match_confidence > 80) {
        matched += invoice.line_items.length
      }
    }
    
    return {
      matched,
      total,
      status: total === 0 ? 'unknown' : matched === total ? 'perfect' : matched > total * 0.8 ? 'good' : 'poor'
    }
  }
  
  // Helper function to get match status badge
  const getMatchStatusBadge = () => {
    const stats = getPOMatchingStats()
    const summary = getMatchingSummary(matchingData)
    
    if (summary.status === 'perfect') {
      return {
        text: 'Perfect Match',
        className: 'bg-green-50 text-green-700 border-green-200'
      }
    } else if (summary.status === 'tolerance') {
      return {
        text: 'Within Tolerance',
        className: 'bg-green-25 text-green-600 border-green-100'
      }
    } else if (summary.status === 'partial') {
      return {
        text: 'Partial Match',
        className: 'bg-amber-50 text-amber-700 border-amber-200'
      }
    } else if (summary.status === 'poor') {
      return {
        text: 'Poor Match',
        className: 'bg-red-50 text-red-700 border-red-200'
      }
    } else {
      return {
        text: 'Not Validated',
        className: 'bg-gray-50 text-gray-700 border-gray-200'
      }
    }
  }

  // Helper function to get total issue counts
  const getIssueCounts = () => {
    const allIssues = Object.values(validationIssues).flat()
    return {
      total: allIssues.length,
      errors: allIssues.filter(issue => issue.type === 'error').length,
      warnings: allIssues.filter(issue => issue.type === 'warning').length
    }
  }

  // Helper function to render validation indicator
  const renderValidationIndicator = (fieldKey: string) => {
    const fieldValidation = validation.getFieldValidation(fieldKey)
    const fieldIssues = fieldValidation.issues
    const matchStatus = getFieldMatchStatus(matchingData, fieldKey)
    const matchResult = getFieldMatchResult(matchingData, fieldKey)
    
    // Show loading indicator if validating
    if (fieldValidation.isValidating) {
      return (
        <div className="ml-2">
          <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    
    // Show badges for matched fields (both perfect match and within tolerance)
    if ((!fieldIssues || fieldIssues.length === 0) && matchStatus === 'matched') {
      if (matchResult === 'perfect_match') {
        return (
          <div className="ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CheckCircle className="h-4 w-4 text-green-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Perfect Match with PO</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      } else if (matchResult === 'within_tolerance') {
        // Get variance details for tooltip
        const fieldMap: { [key: string]: keyof typeof matchingData.data_comparison.comparisons } = {
          amount: 'amount',
          currency: 'currency',
          paymentTerms: 'payment_terms',
          vendor: 'vendor'
        }
        const comparisonKey = fieldMap[fieldKey]
        const comparison = matchingData?.data_comparison?.comparisons?.[comparisonKey]
        const variance = comparison?.details?.variance || 0
        const variancePercent = comparison?.details?.variance_percent || 0
        const sign = variance > 0 ? '+' : ''
        
        return (
          <div className="ml-2 flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full font-medium cursor-help">Within Tolerance</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sign}{formatCurrency(Math.abs(variance), invoice?.currency_code)} ({sign}{Math.abs(variancePercent).toFixed(1)}%) difference vs PO</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      }
    }
    
    // Show green checkmark for fields with no issues
    if (!fieldIssues || fieldIssues.length === 0) {
      return (
        <div className="ml-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      )
    }

    const mostSevere = getMostSevereIssueType(fieldIssues)
    const hasMultiple = fieldIssues.length > 1

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative ml-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 rounded">
            {mostSevere === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            {hasMultiple && (
              <span className="absolute -top-1 -right-1.5 h-3 w-3 bg-gray-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {fieldIssues.length}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4">
            <h4 className="font-medium text-sm mb-3">
              {fieldIssues.length === 1 ? 'Exception' : `${fieldIssues.length} Exceptions`}
            </h4>
            <div className="space-y-3">
              {fieldIssues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {issue.type === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : issue.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{issue.message}</p>
                    {issue.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={issue.action.onClick}
                      >
                        {issue.action.label}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Format date to a more readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified"
    
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date)
    } catch (e) {
      return dateString
    }
  }

  // Format currency for display
  const formatCurrency = (amount?: number, currencyCode?: string) => {
    if (amount === undefined || amount === null) return "Not specified"
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currencyCode || 'USD' 
    }).format(amount)
  }

  // Handle field value changes with validation
  const handleFieldChange = async (fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }))
    
    // Validate the field in real-time
    if (invoice) {
      const updatedInvoice = { ...invoice, [fieldName]: value }
      await validation.validateField(fieldName, value, updatedInvoice)
    }
  }

  // Map UI field names to invoice data structure field names
  const fieldNameMapping: { [key: string]: string } = {
    invoiceNumber: 'invoice_number',
    subtotalAmount: 'subtotal',
    taxAmount: 'tax_amount',
    dueDate: 'due_date',
    paymentTerms: 'payment_term_days',
    currency: 'currency_code',
    billingAddress: 'billing_address',
    paymentMethod: 'payment_method',
    spendCategory: 'spend_category',
    // Fields that map directly (same name)
    vendor: 'vendor',
    amount: 'amount',
    date: 'date'
  }
  
  // Get the actual invoice field name from UI field name
  const getInvoiceFieldName = (uiFieldName: string): string => {
    return fieldNameMapping[uiFieldName] || uiFieldName
  }
  
  // Handle field blur
  const handleFieldBlur = async (fieldName: string, e?: React.FocusEvent) => {
    // Check if we're clicking on another editable field
    const relatedTarget = e?.relatedTarget as HTMLElement
    if (relatedTarget?.closest('[data-editable-field]')) {
      // Don't set to null, let the click handler of the new field handle it
      return
    }
    
    setEditingField(null)
    
    // Save the value to invoice state
    const newValue = fieldValues[fieldName]
    if (newValue !== undefined && invoice) {
      const invoiceFieldName = getInvoiceFieldName(fieldName)
      const updatedInvoice = { ...invoice, [invoiceFieldName]: newValue }
      setInvoice(updatedInvoice)
      
      // Run final validation on blur (use UI field name for validation)
      await validation.validateField(fieldName, newValue, updatedInvoice)
    }
    
    // Clear the temporary field value
    setFieldValues(prev => {
      const { [fieldName]: _, ...rest } = prev
      return rest
    })
  }

  // Get field value
  const getFieldValue = (fieldName: string, defaultValue: string) => {
    if (editingField === fieldName && fieldValues[fieldName] !== undefined) {
      return fieldValues[fieldName]
    }
    return defaultValue
  }

  // Handle resolving issues
  const handleResolveIssue = (fieldKey: string, issueIndex: number) => {
    const issueId = `${fieldKey}-${issueIndex}`
    
    // Mark as resolving
    setResolvingIssues(prev => new Set([...prev, issueId]))
    
    // After 1.5 seconds, start slide-out animation
    setTimeout(() => {
      setResolvedIssues(prev => new Set([...prev, issueId]))
      
      // After slide-out animation completes, remove from issues
      setTimeout(() => {
        setValidationIssues(prev => {
          const newIssues = { ...prev }
          if (newIssues[fieldKey]) {
            newIssues[fieldKey] = newIssues[fieldKey].filter((_, index) => index !== issueIndex)
            if (newIssues[fieldKey].length === 0) {
              delete newIssues[fieldKey]
            }
          }
          return newIssues
        })
        
        setResolvingIssues(prev => {
          const newSet = new Set(prev)
          newSet.delete(issueId)
          return newSet
        })
        
        setResolvedIssues(prev => {
          const newSet = new Set(prev)
          newSet.delete(issueId)
          return newSet
        })
      }, 500) // Wait for slide-out animation to complete
    }, 1500) // Wait 1.5 seconds before starting slide-out
  }

  // Vendor options
  const vendorOptions = [
    { value: "Globex Corporation", label: "Globex Corporation" },
    { value: "Acme Corp", label: "Acme Corp" },
    { value: "TechSolutions Inc", label: "TechSolutions Inc" },
    { value: "Innovation Labs", label: "Innovation Labs" },
    { value: "Digital Dynamics", label: "Digital Dynamics" }
  ]

  // Determine if this invoice is PO-backed
  const isPOBacked = !!(invoice?.po_number || linkedPO || matchingData?.matched_po)

  // EditableField component
  const EditableField = ({ 
    fieldName, 
    label, 
    value, 
    placeholder = "Not specified",
    multiline = false,
    type = "text",
    options = []
  }: {
    fieldName: string
    label: string
    value: string | undefined | null
    placeholder?: string
    multiline?: boolean
    type?: "text" | "date" | "select" | "number"
    options?: { value: string; label: string }[]
  }) => {
    const isEditing = editingField === fieldName
    const fieldValidation = validation.getFieldValidation(fieldName)
    const hasValidationIssues = fieldValidation.issues.length > 0
    const hasError = fieldValidation.hasError
    const hasWarning = fieldValidation.hasWarning
    
    const handleFieldClick = (e: React.MouseEvent) => {
      // Prevent editing when clicking on validation indicator
      const target = e.target as HTMLElement
      if (target.closest('[data-validation-indicator]')) {
        e.stopPropagation()
        return
      }

      // Always set the editing field immediately, even if another field is being edited
      setEditingField(fieldName)
      setFieldValues(prev => ({ ...prev, [fieldName]: value || '' }))
    }
    
    return (
      <div className="group">
        <label className="text-xs text-gray-500 font-medium">{label}</label>
        <div className="mt-0.5 relative">
          {isEditing ? (
            <div className="relative" data-editable-field>
              {fieldName === "vendor" ? (
                <div className="relative">
                  {/* Vendor pill container - maintains exact same layout as read mode */}
                  <div
                    className={cn(
                      "relative text-sm py-2 pl-3 pr-10 rounded-md border transition-all duration-200 cursor-text h-[40px] flex items-center",
                      hasError ? "border-red-200 bg-red-50/50 hover:bg-red-50" : 
                      hasWarning ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50" : 
                      hasValidationIssues ? "border-gray-200 bg-gray-50/30 hover:border-violet-200 hover:bg-violet-50/50" :
                      "border-violet-200 bg-violet-50/50"
                    )}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2">
                      {value && (
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center px-3 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full max-w-full">
                                  <span className="truncate max-w-[200px]">
                                    V078 - {value}
                                  </span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>V078 - {value}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              console.log('X button clicked - removing vendor')
                              handleFieldChange(fieldName, '')
                              setEditingField(null)
                            }}
                            className="hover:bg-gray-200 rounded-full p-0.5 transition-colors flex-shrink-0 bg-white border border-gray-300"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                      {/* Blinking cursor */}
                      <div className="w-0.5 h-4 bg-gray-800 animate-pulse"></div>
                      {!value && <span className="text-gray-400">Select vendor...</span>}
                    </div>
                    <div className="absolute right-3 flex items-center">
                      <div data-validation-indicator className="flex items-center">{renderValidationIndicator(fieldName)}</div>
                    </div>
                  </div>
                  
                  {/* Dropdown overlay - positioned absolutely to not affect layout */}
                  {!removingVendor && (
                    <div className="absolute top-full left-0 right-0 z-40">
                      <Select
                        value=""
                        onValueChange={(val) => {
                          handleFieldChange(fieldName, val)
                          setEditingField(null)
                        }}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingField(null)
                          }
                        }}
                        defaultOpen={true}
                      >
                        <SelectTrigger className="opacity-0 pointer-events-none h-0 overflow-hidden">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="mt-0" side="bottom" align="start" sideOffset={-15}>
                          {vendorOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : multiline ? (
                <textarea
                  className={cn(
                    "w-full text-sm text-gray-900 py-2 px-3 pr-10 rounded-md border transition-all duration-200 focus:outline-none focus:border-violet-500 resize-none",
                    hasError ? "border-red-300 bg-red-50" : 
                    hasWarning ? "border-amber-300 bg-amber-50" : 
                    "border-violet-500 bg-white"
                  )}
                  value={getFieldValue(fieldName, value || '')}
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                  onBlur={(e) => handleFieldBlur(fieldName, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleFieldBlur(fieldName)
                    }
                  }}
                  autoFocus
                  rows={2}
                />
              ) : type === "select" ? (
                <Select
                  value={getFieldValue(fieldName, value || '')}
                  onValueChange={(val) => {
                    handleFieldChange(fieldName, val)
                    setEditingField(null)
                  }}
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingField(null)
                    }
                  }}
                  defaultOpen={true}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full h-[40px] text-sm",
                      hasError ? "border-red-300 bg-red-50 focus:ring-0" : 
                      hasWarning ? "border-amber-300 bg-amber-50 focus:ring-0" : 
                      "border-violet-500 bg-white focus:ring-0"
                    )}
                  >
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (fieldName === "vendor" && !value) ? (
                <Select
                  value=""
                  onValueChange={(val) => {
                    handleFieldChange(fieldName, val)
                    setEditingField(null)
                  }}
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingField(null)
                    }
                  }}
                  defaultOpen={true}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full h-[40px] text-sm",
                      hasError ? "border-red-300 bg-red-50 focus:ring-0" : 
                      hasWarning ? "border-amber-300 bg-amber-50 focus:ring-0" : 
                      "border-violet-500 bg-white focus:ring-0"
                    )}
                  >
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : type === "date" ? (
                <Popover
                  defaultOpen={true}
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingField(null)
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-[40px] justify-start text-left font-normal text-sm px-3",
                        !value && "text-gray-400",
                        hasError ? "border-red-300 bg-red-50 hover:bg-red-50" : 
                        hasWarning ? "border-amber-300 bg-amber-50 hover:bg-amber-50" : 
                        "border-violet-500 bg-white hover:bg-white"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value ? format(new Date(value), "PPP") : placeholder}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={value ? new Date(value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleFieldChange(fieldName, format(date, "yyyy-MM-dd"))
                          setEditingField(null)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <input
                  type={type === "number" ? "text" : type}
                  inputMode={type === "number" ? "decimal" : undefined}
                  className={cn(
                    "w-full h-[40px] text-sm text-gray-900 px-3 pr-10 rounded-md border transition-all duration-200 focus:outline-none focus:border-violet-500",
                    hasError ? "border-red-300 bg-red-50" : 
                    hasWarning ? "border-amber-300 bg-amber-50" : 
                    "border-violet-500 bg-white"
                  )}
                  value={getFieldValue(fieldName, value || '')}
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                  onBlur={(e) => handleFieldBlur(fieldName, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldBlur(fieldName, e as any)
                    }
                  }}
                  autoFocus
                />
              )}
              <div className="absolute right-3 flex items-center">
                <div data-validation-indicator className="flex items-center">
                  {renderValidationIndicator(fieldName)}
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={handleFieldClick}
              data-editable-field
              className={cn(
                "relative text-sm py-2 pl-3 pr-10 rounded-md border transition-all duration-200 cursor-text flex items-center",
                multiline ? "min-h-[40px]" : "h-[40px]",
                hasError ? "border-red-200 bg-red-50/50 hover:bg-red-50" : 
                hasWarning ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50" : 
                hasValidationIssues ? "border-gray-200 bg-gray-50/30 hover:border-violet-200 hover:bg-violet-50/50" :
                "border-gray-200 hover:border-violet-200 hover:bg-violet-50/50"
              )}
            >
              {fieldName === "vendor" && value ? (
                <>
                  <div className="flex items-center flex-1 min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full max-w-full">
                            <span className="truncate max-w-[200px]">
                              V078 - {value}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>V078 - {value}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="absolute right-3 flex items-center gap-0.5">
                    <Edit className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div data-validation-indicator className="flex items-center">{renderValidationIndicator(fieldName)}</div>
                  </div>
                </>
              ) : (
                <span className={cn(
                  "flex-1 truncate pr-2",
                  !value ? "text-gray-400" : "text-gray-900",
                  multiline && "!whitespace-pre-wrap !truncate-none"
                )}>
                  {(() => {
                    if (!value) return placeholder
                    if (type === "date") return formatDate(value)
                    if (type === "number" && (fieldName.includes("amount") || fieldName.includes("Amount"))) {
                      return formatCurrency(parseFloat(value), invoice?.currency_code)
                    }
                    return value
                  })()}
                </span>
              )}
              <div className="absolute right-3 flex items-center gap-0.5">
                <Edit className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div data-validation-indicator className="flex items-center">{renderValidationIndicator(fieldName)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handle download of the original file
  const handleDownload = () => {
    if (fileData && fileName) {
      const link = document.createElement('a')
      link.href = fileData
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Handle removing linked PO
  const handleRemovePO = () => {
    setLinkedPO(null)
  }

  // Handle adding PO (placeholder for now)
  const handleAddPO = () => {
    // This would typically open a PO selection dialog
    // For now, we'll just add a sample PO
    setLinkedPO("PO-2023-001")
  }

  // Handle removing linked GR
  const handleRemoveGR = () => {
    setLinkedGR(null)
  }

  // Handle adding GR (placeholder for now)
  const handleAddGR = () => {
    // This would typically open a GR selection dialog
    // For now, we'll just add a sample GR
    setLinkedGR("GR-2023-001")
  }


  // Render file preview content
  const renderFilePreview = (isFullscreen = false) => {
    if (!fileData) {
      return (
        <div className="bg-white shadow-sm p-8 max-w-xs mx-auto">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 w-3/4 rounded"></div>
            <div className="h-4 bg-gray-200 w-1/2 rounded"></div>
            <div className="h-4 bg-gray-200 w-full rounded"></div>
            <div className="h-4 bg-gray-200 w-3/4 rounded"></div>
            <div className="h-4 bg-gray-200 w-full rounded"></div>
            <div className="flex justify-between mt-8">
              <div className="h-6 bg-gray-200 w-1/4 rounded"></div>
              <div className="h-6 bg-violet-200 w-1/4 rounded"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-6 bg-gray-200 w-1/3 rounded"></div>
              <div className="h-6 bg-gray-200 w-1/4 rounded"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-6 bg-gray-200 w-1/4 rounded"></div>
              <div className="h-6 bg-violet-200 w-1/4 rounded"></div>
            </div>
          </div>
        </div>
      )
    }

    if (fileType === 'application/pdf') {
      return (
        <div className="relative w-full h-full">
          <iframe 
            src={fileData} 
            className="w-full h-full border-0" 
          />
        </div>
      )
    } else if (fileType?.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <img 
            src={fileData} 
            alt="Invoice preview" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">CSV File</p>
          <p className="text-sm text-muted-foreground">CSV files cannot be previewed.</p>
        </div>
      )
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-6 justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="outline" size="sm" className="mr-4 px-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">Invoice {invoice?.invoice_number || 'new'}</h1>

              {/* Compact Workflow Indicator */}
              <div className="ml-8 flex items-center">
                <div className="flex items-center gap-0">
                  {Object.entries(workflowStages).map(([key, stage], index, array) => {
                    const isActive = key === workflowStage
                    const isPast = Object.keys(workflowStages).indexOf(key) < Object.keys(workflowStages).indexOf(workflowStage)
                    const isLast = index === array.length - 1

                    return (
                      <div key={key} className="flex items-center">
                        {/* Step Dot/Pill */}
                        <div className="relative group">
                          <div
                            className={`
                              flex items-center justify-center transition-all duration-300 relative
                              ${isActive 
                                ? 'bg-violet-600 text-white h-6 px-3 rounded-full shadow-sm ring-2 ring-violet-200' 
                                : isPast 
                                  ? 'bg-green-600 text-white h-6 w-6 rounded-full' 
                                  : index >= 2
                                    ? 'bg-gray-100 text-gray-400 h-6 w-6 rounded-full hover:bg-gray-200'
                                    : 'bg-gray-200 text-gray-500 h-6 w-6 rounded-full hover:bg-gray-300'
                              }
                            `}
                          >
                            {/* Content */}
                            <div className="flex items-center gap-1 relative z-10">
                              {isPast ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : isActive ? (
                                <span className="text-xs font-medium whitespace-nowrap">{stage.label}</span>
                              ) : (
                                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                              )}
                            </div>
                          </div>

                          {/* Hover tooltip for non-active steps */}
                          {!isActive && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30">
                              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap relative">
                                {stage.label}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Connecting Line */}
                        {!isLast && (
                          <div className="relative w-6 lg:w-8">
                            <div 
                              className={`
                                absolute top-1/2 -translate-y-1/2 h-0.5 w-full transition-all duration-300
                                ${isPast ? 'bg-green-600' : 'bg-gray-200'}
                              `}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <MoreVertical className="h-4 w-4" />
                    <span className="hidden sm:inline">More Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="gap-2">
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                    <span>Approve with Exceptions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span>Request Approval</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span>Schedule Payment</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Contextual Message Banner */}
        {invoice && invoice.amount > 2500 && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-blue-800">
                Amount exceeds your approval limit ($2,500). Requires manager approval.
              </span>
            </div>
          </div>
        )}

        <div className="bg-gray-50/50 border-b">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
              {/* PO Reference */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <FileCheck className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 tracking-wider">Purchase Order</p>
                  <p className="text-sm font-semibold text-gray-900 -mt-0.5">
                    {invoice?.po_number || "Not Linked"}
                  </p>
                </div>
              </div>

              {/* Separator */}
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />

              {/* PO Available Balance */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 tracking-wider">PO Total</p>
                  <p className="text-sm font-semibold text-gray-900 -mt-0.5">
                    {(() => {
                      if (!invoice?.po_number) return "N/A"
                      if (matchingData?.matched_po?.total_amount) {
                        const poAmount = parseFloat(matchingData.matched_po.total_amount)
                        return formatCurrency(poAmount, invoice.currency_code)
                      }
                      return "Loading..."
                    })()}
                  </p>
                </div>
              </div>

              {/* Separator */}
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />

              {/* Invoice Total */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <Receipt className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 tracking-wider">Invoice Total</p>
                  <p className="text-sm font-semibold text-gray-900 -mt-0.5">
                    {invoice ? formatCurrency(invoice.amount, invoice.currency_code) : "$0.00"}
                  </p>
                </div>
              </div>

              {/* Variance - only show if there's a PO */}
              {invoice?.po_number && (
                <>
                  <div className="h-8 w-px bg-gray-200 hidden sm:block" />

                  {/* Variance */}
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-violet-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 tracking-wider">Variance</p>
                      <div className="flex items-center -mt-0.5">
                        {(() => {
                          // Get variance from backend matching data
                          const amountComparison = matchingData?.data_comparison?.comparisons?.amount
                          
                          if (!amountComparison) {
                            return <p className="text-sm font-semibold text-gray-500">N/A</p>
                          }
                          
                          if (amountComparison.result === 'perfect_match') {
                            return (
                              <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full mt-0.5">
                                <span className="text-[10px] font-medium">Perfect Match</span>
                              </div>
                            )
                          }
                          
                          if (amountComparison.result === 'within_tolerance') {
                            const variance = amountComparison.details?.variance || 0
                            const variancePercent = amountComparison.details?.variance_percent || 0
                            const sign = variance > 0 ? '+' : ''
                            
                            return (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-semibold text-green-600">
                                    {sign}{formatCurrency(variance, invoice.currency_code)}
                                  </p>
                                  <span className="text-xs text-green-600">
                                    ({sign}{variancePercent.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-600 rounded-full mt-0.5">
                                  <span className="text-[10px] font-medium">Within 5% Tolerance</span>
                                </div>
                              </div>
                            )
                          }
                          
                          // Show actual variance
                          const variance = amountComparison.details?.variance || 0
                          const variancePercent = amountComparison.details?.variance_percent || 0
                          
                          if (variance === 0) {
                            return (
                              <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full mt-0.5">
                                <span className="text-[10px] font-medium">Perfect Match</span>
                              </div>
                            )
                          }
                          
                          const varianceColor = Math.abs(variancePercent) > 10 ? 'text-red-600' : 'text-amber-600'
                          const sign = variance > 0 ? '+' : ''
                          
                          return (
                            <div className="flex items-center gap-1">
                              <p className={`text-sm font-semibold ${varianceColor}`}>
                                {sign}{formatCurrency(variance, invoice.currency_code)}
                              </p>
                              <span className={`text-xs ${varianceColor}`}>
                                ({sign}{variancePercent.toFixed(1)}%)
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* No PO Status - only show if no PO */}
              {!invoice?.po_number && (
                <>
                  <div className="h-8 w-px bg-gray-200 hidden sm:block" />
                  
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-violet-100 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 tracking-wider">Status</p>
                      <div className="flex items-center gap-2 -mt-0.5">
                        <p className="text-sm font-semibold text-gray-600">
                          Manual Review
                        </p>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-medium rounded-full">
                          No PO Match
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Assignee - Right Side */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                    flex items-center justify-center w-7 h-7 text-white rounded-full text-xs font-medium 
                    hover:ring-2 hover:ring-gray-300 transition-all cursor-pointer
                    ${assigneeOptions.find(a => a.initials === currentAssignee)?.color || 'bg-violet-500'}
                  `}
                  title="Click to reassign"
                >
                  {currentAssignee}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                  Assign to:
                </div>
                {assigneeOptions.map((assignee) => (
                  <DropdownMenuItem
                    key={assignee.initials}
                    className="gap-3 py-2"
                    onClick={() => setCurrentAssignee(assignee.initials)}
                  >
                    <div className={`
                      flex items-center justify-center w-8 h-8 text-white rounded-full text-xs font-medium
                      ${assignee.color}
                    `}>
                      {assignee.initials}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{assignee.name}</p>
                      <p className="text-xs text-gray-500">{assignee.role}</p>
                    </div>
                    {currentAssignee === assignee.initials && (
                      <Check className="h-4 w-4 text-green-600 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-6 flex flex-col overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 flex-1">
            {/* PDF Preview - Independent */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b p-3 h-12">
                <h3 className="font-medium">Invoice Preview</h3>
                <div className="flex items-center gap-2">
                  <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogPortal>
                      <DialogOverlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-[95vw] max-h-[95vh] h-full bg-white rounded-lg shadow-lg overflow-hidden">
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b">
                              <DialogTitle className="font-medium">Invoice Preview - Fullscreen</DialogTitle>
                              <Button variant="ghost" size="icon" onClick={() => setIsFullscreenOpen(false)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1 bg-gray-100 overflow-auto">
                              {renderFilePreview(true)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogPortal>
                  </Dialog>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center p-2 bg-gray-100 overflow-auto" ref={pdfContainerRef}>
                {renderFilePreview()}
              </div>
            </div>

            {/* Tabbed Content - Controls right side only */}
            <div className="flex flex-col flex-1">
              <Tabs defaultValue="details" className="flex-1 flex flex-col">
                <div className="border-b flex items-center justify-between">
                  <TabsList className="h-12 bg-transparent p-0 w-auto gap-6">
                    <TabsTrigger
                      value="details"
                      className="h-12 px-0 data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:text-violet-600 data-[state=active]:shadow-none rounded-none"
                    >
                      Details
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="h-12 px-0 data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:text-violet-600 data-[state=active]:shadow-none rounded-none"
                    >
                      Activity
                    </TabsTrigger>
                    <TabsTrigger
                      value="attachments"
                      className="h-12 px-0 data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:text-violet-600 data-[state=active]:shadow-none rounded-none"
                    >
                      Attachments
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="details" className="flex-1 p-0 mt-4">
                  <div className="border rounded-lg overflow-hidden h-full">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Invoice Details</h2>
                        {getIssueCounts().total > 0 && (
                          <Sheet open={isIssuesDrawerOpen} onOpenChange={setIsIssuesDrawerOpen}>
                            <SheetTrigger asChild>
                              <button className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                                getIssueCounts().errors > 0 
                                  ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              )}>
                                Exceptions ({getIssueCounts().total})
                              </button>
                            </SheetTrigger>
                            <SheetPortal>
                              <SheetPrimitive.Content
                                className="fixed inset-y-0 right-0 z-50 h-full w-[60vw] max-w-[500px] sm:max-w-[600px] flex flex-col gap-4 bg-background p-6 transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right border-l"
                                style={{boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}
                              >
                              <SheetHeader className="flex-shrink-0 pb-4 border-b">
                                <SheetTitle className="text-lg font-semibold text-gray-900">Processing Exceptions</SheetTitle>
                                <p className="text-sm text-gray-600 mt-1">Review and resolve validation exceptions before approval</p>
                          </SheetHeader>

                          <div className="flex-1 overflow-y-auto mt-4">
                            {/* Summary */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 text-base">Exception Summary</h3>
                                <div className="flex items-center gap-4 text-sm">
                                  {getIssueCounts().errors > 0 && (
                                    <div className="flex items-center gap-1.5 text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="font-medium">{getIssueCounts().errors} critical</span>
                                    </div>
                                  )}
                                  {getIssueCounts().warnings > 0 && (
                                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                      <AlertTriangle className="h-4 w-4" />
                                      <span className="font-medium">{getIssueCounts().warnings} review required</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                The following exceptions require review before this invoice can be processed for payment. Critical exceptions must be resolved, while others may be approved with authorization.
                              </p>
                            </div>

                            {/* Issues by Field */}
                            <div className="space-y-4">
                              {Object.entries(validationIssues).map(([fieldKey, fieldIssues]) => {
                                // Filter out resolved issues
                                const activeIssues = fieldIssues.filter((_, index) => {
                                  const issueId = `${fieldKey}-${index}`
                                  return !resolvedIssues.has(issueId)
                                })
                                
                                // Don't render section if no active issues
                                if (activeIssues.length === 0) return null
                                
                                return (
                                  <div key={fieldKey} className="mb-4">
                                    <div className="mb-3 border-l-4 border-indigo-500 pl-3">
                                      <h4 className="font-semibold text-gray-900 text-sm">{getFieldDisplayName(fieldKey)}</h4>
                                      <p className="text-xs text-gray-600 mt-0.5">{activeIssues.length} exception{activeIssues.length > 1 ? 's' : ''} found</p>
                                    </div>
                                  
                                    <div className="space-y-4">
                                      {fieldIssues.map((issue, index) => {
                                        const issueId = `${fieldKey}-${index}`
                                        const isResolving = resolvingIssues.has(issueId)
                                        const isResolved = resolvedIssues.has(issueId)

                                        return (
                                          <div 
                                            key={index} 
                                            className={`relative bg-white border rounded-lg p-3 hover:shadow-md transition-all duration-300 ${
                                              isResolved ? 'transform translate-x-full opacity-0 pointer-events-none' :
                                              isResolving ? 'border-green-300 bg-green-50' : 
                                              issue.type === 'error' ? 'border-red-200 hover:shadow-lg hover:border-red-300' :
                                              'border-amber-200 hover:shadow-lg hover:border-amber-300'
                                            }`}
                                            style={{
                                              height: isResolved ? '0' : 'auto',
                                              marginBottom: isResolved ? '0' : undefined,
                                              overflow: isResolved ? 'hidden' : 'visible'
                                            }}
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className="flex-shrink-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                                  isResolving ? 'bg-green-100 border-green-300' : 
                                                  issue.type === 'error' ? 'bg-red-50 border-red-200' : 
                                                  issue.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                                                }`}>
                                                  {isResolving ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                  ) : issue.type === 'error' ? (
                                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                                  ) : issue.type === 'warning' ? (
                                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                  ) : (
                                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-2">
                                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                                                    issue.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                                  }`}>
                                                    {issue.type === 'error' ? 'Critical' : 'Review Required'}
                                                  </span>
                                                </div>
                                                <p className="text-xs font-medium text-gray-900 mb-2 leading-snug">{issue.message}</p>
                                                {issue.action && (
                                                  <div className="flex items-center gap-2 mt-1.5">
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className={`h-7 text-xs font-medium px-3 transition-all duration-300 ${
                                                        isResolving 
                                                          ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-100' 
                                                          : issue.type === 'error'
                                                            ? 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
                                                            : 'border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400'
                                                      }`}
                                                      disabled={isResolving}
                                                      onClick={() => {
                                                        if (!isResolving) {
                                                          issue.action?.onClick()
                                                          handleResolveIssue(fieldKey, index)
                                                        }
                                                      }}
                                                    >
                                                      {isResolving ? (
                                                        <>
                                                          <CheckCircle className="h-3 w-3 mr-1.5" />
                                                          Resolved
                                                        </>
                                                      ) : (
                                                        issue.action.label
                                                      )}
                                                    </Button>
                                                    {!isResolving && (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs font-medium px-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                                        onClick={() => handleResolveIssue(fieldKey, index)}
                                                      >
                                                        Mark as Reviewed
                                                      </Button>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Actions - Fixed at bottom */}
                          {getIssueCounts().errors === 0 && (
                            <div className="flex-shrink-0 mt-8 pt-6 border-t">
                              <Button className="w-full bg-violet-600 hover:bg-violet-700">
                                Save with Warnings
                              </Button>
                            </div>
                          )}
                                <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                                  <X className="h-4 w-4" />
                                  <span className="sr-only">Close</span>
                                </SheetClose>
                              </SheetPrimitive.Content>
                            </SheetPortal>
                      </Sheet>
                    )}
                  </div>

                      <div className="space-y-8">
                        {/* GENERAL INFO Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoice Header</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          {/* Critical matching fields */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <EditableField
                                fieldName="invoiceNumber"
                                label="Invoice Number"
                                value={invoice?.invoice_number}
                              />
                              <div className="space-y-1">
                                <EditableField
                                  fieldName="vendor"
                                  label="Vendor"
                                  value={invoice?.vendor}
                                />
                                {invoice?.vendor && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Approved
                                    </span>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors">
                                          <Clock className="h-3 w-3" />
                                          <span className="font-medium">92%</span>
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64">
                                        <div className="text-sm">
                                          <p className="font-medium">Payment History</p>
                                          <p className="text-gray-600">92% on-time payments</p>
                                          <p className="text-gray-600 text-xs mt-1">46 of 50 invoices paid on schedule</p>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FINANCIAL Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Financial Details</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Row 1: Total Amount, Currency */}
                            <div className="grid grid-cols-2 gap-4">
                              <EditableField
                                fieldName="amount"
                                label="Total Amount"
                                value={invoice?.amount?.toString() || ''}
                                type="number"
                              />
                              <EditableField
                                fieldName="currency"
                                label="Currency"
                                value={invoice?.currency_code || "USD"}
                                type="select"
                                options={[
                                  { value: "USD", label: "USD - US Dollar" },
                                  { value: "EUR", label: "EUR - Euro" },
                                  { value: "GBP", label: "GBP - British Pound" },
                                  { value: "CAD", label: "CAD - Canadian Dollar" },
                                  { value: "AUD", label: "AUD - Australian Dollar" }
                                ]}
                              />
                            </div>
                            
                            {/* Row 2: Subtotal, Tax Rate */}
                            <div className="grid grid-cols-2 gap-4">
                              <EditableField
                                fieldName="subtotalAmount"
                                label="Subtotal"
                                value={invoice?.subtotal?.toString() || (invoice?.amount && invoice?.tax_amount ? (invoice.amount - invoice.tax_amount).toString() : '')}
                                type="number"
                              />
                              <EditableField
                                fieldName="taxRate"
                                label="Tax Rate"
                                value={invoice?.tax_rate ? `${invoice.tax_rate}%` : '17.5%'}
                                type="select"
                                options={[
                                  { value: "0%", label: "0%" },
                                  { value: "5%", label: "5%" },
                                  { value: "10%", label: "10%" },
                                  { value: "15%", label: "15%" },
                                  { value: "17.5%", label: "17.5%" },
                                  { value: "20%", label: "20%" }
                                ]}
                              />
                            </div>
                            
                            {/* Row 3: Tax Amount (first column only) */}
                            <div className="grid grid-cols-2 gap-4">
                              <EditableField
                                fieldName="taxAmount"
                                label="Tax Amount"
                                value={invoice?.tax_amount?.toString() || ''}
                                type="number"
                              />
                              <div></div>
                            </div>
                          </div>
                        </div>

                        {/* PAYMENT SCHEDULE Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment Schedule</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <EditableField
                              fieldName="date"
                              label="Invoice Date"
                              value={invoice?.date || ''}
                              type="date"
                            />
                            <div className="space-y-1">
                              <EditableField
                                fieldName="dueDate"
                                label="Due Date"
                                value={invoice?.due_date || ''}
                                type="date"
                              />
                              {invoice?.due_date && new Date(invoice.due_date) < new Date() && (
                                <div className="text-xs text-red-600 font-medium">
                                  Overdue by {Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* PAYMENT Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment Terms</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <EditableField
                                fieldName="paymentMethod"
                                label="Payment Method"
                                value={invoice?.payment_method || ''}
                                type="select"
                                options={[
                                  { value: "ACH Transfer", label: "ACH Transfer" },
                                  { value: "Wire Transfer", label: "Wire Transfer" },
                                  { value: "Check", label: "Check" },
                                  { value: "Credit Card", label: "Credit Card" }
                                ]}
                              />
                              {invoice?.payment_method === "ACH Transfer" ? (
                                <div className="text-xs text-gray-600">
                                  Bank: Wells Fargo ***1234
                                </div>
                              ) : null}
                            </div>
                            <EditableField
                              fieldName="billingAddress"
                              label="Billing Address"
                              value={invoice?.billing_address || ''}
                              multiline={true}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <EditableField
                              fieldName="paymentTerms"
                              label="Payment Terms"
                              value={invoice?.payment_term_days || ''}
                              type="select"
                              options={[
                                { value: "Net 7", label: "Net 7 (No early payment discount)" },
                                { value: "Net 15", label: "Net 15" },
                                { value: "Net 30", label: "Net 30" },
                                { value: "2/10 Net 30", label: "2/10 Net 30 (2% discount if paid in 10 days)" },
                                { value: "Due on Receipt", label: "Due on Receipt" }
                              ]}
                            />
                            {/* GL Account / Cost Center - Only show for non-PO invoices */}
                            {!isPOBacked && (
                              <EditableField
                                fieldName="glAccount"
                                label="GL Account / Cost Center"
                                value="6200-001 - Professional Services"
                                type="select"
                                options={[
                                  { value: "6200-001 - Professional Services", label: "6200-001 - Professional Services" },
                                  { value: "6100-002 - IT Services", label: "6100-002 - IT Services" },
                                  { value: "5500-003 - Marketing", label: "5500-003 - Marketing" },
                                  { value: "4400-004 - Operations", label: "4400-004 - Operations" }
                                ]}
                              />
                            )}
                          </div>
                          
                          {/* Spend Category - Only show for non-PO invoices */}
                          {!isPOBacked && (
                            <div className="grid grid-cols-2 gap-4">
                              <EditableField
                                fieldName="spendCategory"
                                label="Spend Category"
                                value={invoice?.spend_category || "Professional Services"}
                                type="select"
                                options={[
                                  { value: "Professional Services", label: "Professional Services (UNSPSC: 81111500)" },
                                  { value: "IT Services", label: "IT Services (UNSPSC: 81101500)" },
                                  { value: "Marketing Services", label: "Marketing Services (UNSPSC: 82101500)" },
                                  { value: "Facilities Management", label: "Facilities Management (UNSPSC: 72100000)" }
                                ]}
                              />
                              <div></div>
                            </div>
                          )}
                        </div>


                        {/* LINKED DOCUMENTS Section */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Document Matching</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="space-y-3">
                            {/* Matching Summary - only show when PO is linked */}
                            {linkedPO && matchingData && (
                              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "h-2 w-2 rounded-full",
                                      getMatchingSummary(matchingData).status === 'perfect' ? "bg-green-500" :
                                      getMatchingSummary(matchingData).status === 'partial' ? "bg-amber-500" :
                                      "bg-red-500"
                                    )} />
                                    <span className="text-sm font-medium text-gray-700">
                                      {getMatchingSummary(matchingData).message}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {getMatchingSummary(matchingData).confidence}% match
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Purchase Order Link */}
                            {linkedPO ? (
                              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">PO {linkedPO}</span>
                                      {(() => {
                                        const stats = getPOMatchingStats()
                                        return stats.total > 0 ? (
                                          <span className="text-xs text-gray-500">- {stats.matched} of {stats.total} items matched</span>
                                        ) : (
                                          <span className="text-xs text-gray-500">- Validating...</span>
                                        )
                                      })()}
                                    </div>
                                    <div className="text-xs text-gray-500">Purchase Order</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const badge = getMatchStatusBadge()
                                    return (
                                      <Badge 
                                        variant="secondary" 
                                        className={cn(badge.className, "hover:bg-opacity-80")}
                                      >
                                        {badge.text}
                                      </Badge>
                                    )
                                  })()}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110" 
                                    onClick={handleRemovePO}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-500">No Purchase Order linked</div>
                                    <div className="text-xs text-gray-400">Link PO to enable 3-way match validation</div>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 gap-1 text-xs" 
                                  onClick={handleAddPO}
                                >
                                  <Plus className="h-3 w-3" />
                                  Link PO
                                </Button>
                              </div>
                            )}

                            {/* Goods Receipt Link */}
                            {linkedGR ? (
                              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <Receipt className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">GR {linkedGR}</span>
                                      <span className="text-xs text-gray-500">- 4 of 4 items received</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Goods Receipt</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="secondary" 
                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50"
                                  >
                                    Received
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110" 
                                    onClick={handleRemoveGR}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                    <Receipt className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-500">No Goods Receipt linked</div>
                                    <div className="text-xs text-gray-400">Link GR to confirm goods receipt</div>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 gap-1 text-xs" 
                                  onClick={handleAddGR}
                                >
                                  <Plus className="h-3 w-3" />
                                  Link GR
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BUDGET OVERVIEW Section - Collapsible */}
                        <div className="space-y-4 pt-2">
                          <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setBudgetSectionExpanded(!budgetSectionExpanded)}
                          >
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Budget Overview</span>
                            
                            {/* Budget Status Indicators when collapsed */}
                            {!budgetSectionExpanded && (
                              <div className="flex items-center gap-2 text-xs">
                                {/* Budget Usage Bar */}
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-orange-400 rounded-full transition-all duration-500"
                                    style={{ width: '85%' }}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 font-medium">85%</span>
                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                              {budgetSectionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                          
                          {budgetSectionExpanded && (
                            <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 font-medium">Budget Status</label>
                                <div className="mt-2 border border-gray-200 rounded-lg p-4 h-full flex flex-col">
                                  <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="font-medium text-gray-700">Q1 Professional Services</span>
                                    <span className="text-gray-600 font-medium">85%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-3">
                                    <div 
                                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                                      style={{ width: '85%' }}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500 text-xs">Total Budget</p>
                                      <p className="font-medium text-gray-900">$47,000</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">Used</p>
                                      <p className="font-medium text-gray-900">$40,463</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">Remaining</p>
                                      <p className="font-medium text-green-600">$6,537</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">Days Left</p>
                                      <p className="font-medium text-gray-900">24 days</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col">
                                <label className="text-xs text-gray-500 font-medium">Budget Impact</label>
                                <div className="mt-2 border border-gray-200 rounded-lg p-4 h-full flex flex-col">
                                  <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="font-medium text-gray-700">This Invoice Impact</span>
                                    <span className="text-amber-600 font-medium">53%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-3">
                                    <div 
                                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                                      style={{ width: '53%' }}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500 text-xs">Invoice Amount</p>
                                      <p className="font-medium text-gray-900">$3,463</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">% of Remaining Budget</p>
                                      <p className="font-medium text-gray-900">53%</p>
                                    </div>
                                  </div>
                                  <div className="pt-2 mt-4 border-t flex-1 flex items-end">
                                    <p className="text-xs text-amber-600">
                                      <Info className="h-3 w-3 inline mr-1" />
                                      Approval will leave $3,074 for the remaining quarter
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 p-0 mt-4">
                  <div className="border rounded-lg overflow-hidden h-full min-h-[70vh]">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Activity Log</h2>
                        <div></div>
                      </div>
                      <div className="space-y-6">
                        {/* Current Status */}
                        <div className="relative">
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 ring-4 ring-blue-50">
                                <Eye className="h-5 w-5" />
                              </div>
                              <div className="absolute top-10 left-1/2 w-0.5 h-6 bg-gray-200 -translate-x-1/2"></div>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-blue-600">Under Review</p>
                              <p className="text-sm text-muted-foreground">Invoice assigned to Sarah Chen (AP Manager) for final approval</p>
                              <p className="text-xs text-muted-foreground mt-1">Current status</p>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Header */}
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <Clock className="h-3 w-3" />
                          Activity Timeline
                        </div>

                        {/* Timeline Items */}
                        <div className="relative">
                          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                          <div className="space-y-6">
                            <div className="relative flex items-start gap-4">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 ring-2 ring-white shadow-sm">
                                <CheckCircle className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">Budget approval obtained</p>
                                <p className="text-sm text-muted-foreground">Budget impact approved by Finance Director (Anna Rodriguez)</p>
                                <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                              </div>
                            </div>

                            <div className="relative flex items-start gap-4">
                              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 ring-2 ring-white shadow-sm">
                                <Shield className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">Compliance check completed</p>
                                <p className="text-sm text-muted-foreground">VAT rate validated, vendor details verified against internal database</p>
                                <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
                              </div>
                            </div>

                            <div className="relative flex items-start gap-4">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 ring-2 ring-white shadow-sm">
                                <LinkIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">Purchase Order matched</p>
                                <p className="text-sm text-muted-foreground">Automatically linked to PO #PO-2024-0847 based on vendor and amount</p>
                                <p className="text-xs text-muted-foreground mt-1">8 minutes ago</p>
                              </div>
                            </div>

                            <div className="relative flex items-start gap-4">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 ring-2 ring-white shadow-sm">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">Invoice created</p>
                                <p className="text-sm text-muted-foreground">Created from uploaded file with extracted data</p>
                                <p className="text-xs text-muted-foreground mt-1">12 minutes ago</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="flex-1 p-0 mt-4">
                  <div className="border rounded-lg overflow-hidden h-full min-h-[70vh]">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Attachments</h2>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Plus className="h-4 w-4" />
                          Add Attachment
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {/* Primary Documents */}
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                            <Receipt className="h-3 w-3" />
                            Primary Documents
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border border-violet-200 bg-violet-50/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                                  <Receipt className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">Original Invoice</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>invoice_globex_2024_0847.pdf</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">PDF</Badge>
                                    <span>•</span>
                                    <span>2.4 MB</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleDownload}>
                                  <Download className="h-3 w-3" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Supporting Documents */}
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                            <FileCheck className="h-3 w-3" />
                            Supporting Documents
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">Purchase Order</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>PO-2024-0847.pdf</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">PDF</Badge>
                                    <span>•</span>
                                    <span>1.2 MB</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-1">
                                  <Download className="h-3 w-3" />
                                  Download
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                  <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">Goods Receipt Note</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>GRN-2024-1205.pdf</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">PDF</Badge>
                                    <span>•</span>
                                    <span>856 KB</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-1">
                                  <Download className="h-3 w-3" />
                                  Download
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                  <FileImage className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">Proof of Delivery</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>delivery_confirmation.jpg</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">JPG</Badge>
                                    <span>•</span>
                                    <span>3.1 MB</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-1">
                                  <Download className="h-3 w-3" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Files */}
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                            <Package className="h-3 w-3" />
                            Additional Files
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">Service Agreement</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>service_contract_2024.pdf</span>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">PDF</Badge>
                                    <span>•</span>
                                    <span>745 KB</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 gap-1">
                                  <Download className="h-3 w-3" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Line Items Section - Full Width at Bottom */}
          <div className="border rounded-lg overflow-hidden mt-6">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-lg">Line Items</h3>
                {invoice?.line_items && invoice.line_items.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    {getLineItemStats().matched > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-full">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700 text-xs">{getLineItemStats().matched} matched</span>
                      </div>
                    )}
                    {getLineItemStats().variances > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-full">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <span className="text-gray-700 text-xs">{getLineItemStats().variances} variances</span>
                      </div>
                    )}
                    {getLineItemStats().unmatched > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-full">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700 text-xs">{getLineItemStats().unmatched} unmatched</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden">
              {invoice?.line_items && invoice.line_items.length > 0 ? (
                <div className="flex">
                  {/* Frozen Invoice Columns */}
                  <div className="flex-shrink-0 bg-white z-10 shadow-sm" style={{ boxShadow: '4px 0 8px -2px rgba(0, 0, 0, 0.1)' }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 h-auto">
                          <TableHead className="w-8 text-center text-sm font-medium py-2 px-2">#</TableHead>
                          <TableHead className="w-20 text-sm font-medium py-2 px-2">Status</TableHead>
                          <TableHead className="w-48 text-sm font-medium py-2 px-2">Description<br/>(Invoice)</TableHead>
                          <TableHead className="w-12 text-right text-sm font-medium py-2 px-2">Qty</TableHead>
                          <TableHead className="w-16 text-right text-sm font-medium py-2 px-2">Unit<br/>Price</TableHead>
                          <TableHead className="w-16 text-right text-sm font-medium py-2 px-2 border-r-2 border-violet-300">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.line_items.map((item, index) => {
                          const status = getLineItemStatus(index)
                          const match = lineItemMatches[index]
                          const poLine = null // TODO: Get from backend data
                          const grLine = match?.grLineId ? mockGRLines.find(gr => gr.id === match.grLineId) : null
                          
                          return (
                            <TableRow key={index} className="hover:bg-gray-50 h-[50px]">
                              <TableCell className="text-center text-sm font-medium text-gray-600 h-[50px] py-1 px-2 align-middle">{index + 1}</TableCell>
                              <TableCell className="h-[50px] py-1 px-2 align-middle">
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs font-medium px-1.5 py-0.5",
                                    status === 'matched' && "bg-green-100 text-green-700 hover:bg-green-100",
                                    status === 'mismatch' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                    status === 'missing' && "bg-red-100 text-red-700 hover:bg-red-100"
                                  )}
                                >
                                  {status === 'matched' ? 'Matched' : status === 'mismatch' ? 'Variance' : 'Unmatched'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium h-[50px] py-1 px-2 align-middle">
                                {editingLineItem === index ? (
                                  <Input
                                    ref={(el) => { descriptionInputRefs.current[index] = el }}
                                    value={lineItemValues[index]?.description || ''}
                                    onChange={(e) => handleLineItemValueChange(index, 'description', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm px-2 py-1"
                                    placeholder="Enter description"
                                  />
                                ) : (
                                  <div className="truncate max-w-44" title={item.description}>
                                    {item.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right text-sm h-[50px] py-1 px-2 align-middle",
                                !forcedMatchedItems.has(index) && ((poLine && Number(item.quantity) !== Number(poLine.quantity)) || (grLine && Number(item.quantity) !== Number(grLine.quantity))) && "bg-amber-50"
                              )}>
                                {editingLineItem === index ? (
                                  <Input
                                    type="number"
                                    value={lineItemValues[index]?.quantity || ''}
                                    onChange={(e) => handleLineItemValueChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm text-right px-2 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right text-sm h-[50px] py-1 px-2 align-middle",
                                !forcedMatchedItems.has(index) && (poLine && Number(item.unit_price) !== Number(poLine.unit_price)) && "bg-amber-50"
                              )}>
                                {editingLineItem === index ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={lineItemValues[index]?.unit_price || ''}
                                    onChange={(e) => handleLineItemValueChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm text-right px-2 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0.00"
                                  />
                                ) : (
                                  formatCurrency(item.unit_price, invoice.currency_code)
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm h-[50px] py-1 px-2 border-r-2 border-violet-300 align-middle">
                                {editingLineItem === index ? 
                                  formatCurrency(lineItemValues[index]?.total || 0, invoice.currency_code) :
                                  formatCurrency(item.total, invoice.currency_code)
                                }
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Scrollable PO/GR Columns */}
                  <div className="flex-1 overflow-x-auto bg-white shadow-sm">
                    <Table className={cn(
                      "w-full",
                      linkedPO && linkedGR && "min-w-[600px]",
                      linkedPO && !linkedGR && "min-w-[400px]",
                      !linkedPO && linkedGR && "min-w-[300px]"
                    )}>
                      <TableHeader>
                        <TableRow className="bg-gray-50 h-auto">
                          {linkedPO && (
                            <>
                              <TableHead className="min-w-[60px] text-sm font-medium py-2 px-2">PO Line<br/>Source</TableHead>
                              <TableHead className="min-w-[120px] text-sm font-medium py-2 px-2">PO Description</TableHead>
                              <TableHead className="min-w-[40px] text-right text-sm font-medium py-2 px-2">PO<br/>Qty</TableHead>
                              <TableHead className="min-w-[60px] text-right text-sm font-medium py-2 px-2">PO Unit<br/>Price</TableHead>
                              <TableHead className={cn(
                                "min-w-[60px] text-right text-sm font-medium py-2 px-2",
                                !linkedGR && "border-r-2 border-violet-300"
                              )}>PO<br/>Total</TableHead>
                            </>
                          )}
                          {linkedGR && (
                            <>
                              <TableHead className={cn(
                                "min-w-[60px] text-sm font-medium py-2 px-2",
                                linkedPO && "border-l-2 border-violet-300"
                              )}>GR Line<br/>Source</TableHead>
                              <TableHead className="min-w-[120px] text-sm font-medium py-2 px-2">GR Description</TableHead>
                              <TableHead className="min-w-[40px] text-right text-sm font-medium py-2 px-2 border-r-2 border-violet-300">GR<br/>Qty</TableHead>
                            </>
                          )}
                          <TableHead className={cn(
                            "text-center text-sm font-medium py-2 px-2",
                            !linkedPO && !linkedGR ? "w-1/2" : "min-w-[40px]"
                          )}>Comments</TableHead>
                          <TableHead className={cn(
                            "text-center text-sm font-medium py-2 px-2",
                            !linkedPO && !linkedGR ? "w-1/2" : "min-w-[40px]"
                          )}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.line_items.map((item, index) => {
                          const match = lineItemMatches[index]
                          const poLine = null // TODO: Get from backend data
                          const grLine = match?.grLineId ? mockGRLines.find(gr => gr.id === match.grLineId) : null
                          
                          // Get all selected PO and GR items for this dropdown
                          const selectedPOItems = Object.values(lineItemMatches)
                            .filter(m => m.poLineId)
                            .map(m => m.poLineId!)
                          const selectedGRItems = Object.values(lineItemMatches)
                            .filter(m => m.grLineId)
                            .map(m => m.grLineId!)
                          
                          return (
                            <TableRow key={index} className="hover:bg-gray-50 h-[50px]">
                              {/* PO Columns - only show if PO is linked */}
                              {linkedPO && (
                                <>
                                  {/* PO Line Source */}
                                  <TableCell className="h-[50px] py-1 px-2 align-middle">
                                    <LineItemSelector
                                      items={[]} // TODO: Get PO line items from backend
                                      value={match?.poLineId}
                                      onSelect={(value) => handleLineItemMatch(index, 'po', value)}
                                      placeholder="Select line"
                                      type="po"
                                      lineNumber={match?.poLineId ? parseInt(match.poLineId.split('-').pop() || '0') : undefined}
                                      isEmpty={!match?.poLineId}
                                      formatCurrency={formatCurrency}
                                      currency={invoice.currency_code}
                                      selectedItems={selectedPOItems}
                                    />
                                  </TableCell>
                                  
                                  {/* PO Details */}
                                  <TableCell className="text-sm text-gray-600 h-[50px] py-1 px-2 align-middle">
                                    <div className="truncate w-full" title={poLine?.description || "—"}>
                                      {poLine?.description || "—"}
                                    </div>
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 align-middle",
                                    !forcedMatchedItems.has(index) && poLine && Number(item.quantity) !== Number(poLine.quantity) && "bg-amber-50"
                                  )}>
                                    {poLine?.quantity || "—"}
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 align-middle",
                                    !forcedMatchedItems.has(index) && poLine && Number(item.unit_price) !== Number(poLine.unit_price) && "bg-amber-50"
                                  )}>
                                    {poLine ? formatCurrency(poLine.unit_price, invoice.currency_code) : "—"}
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 align-middle",
                                    !linkedGR && "border-r-2 border-violet-300"
                                  )}>
                                    {poLine ? formatCurrency(poLine.total, invoice.currency_code) : "—"}
                                  </TableCell>
                                </>
                              )}
                              
                              {/* GR Columns - only show if GR is linked */}
                              {linkedGR && (
                                <>
                                  {/* GR Line Source */}
                                  <TableCell className={cn(
                                    "h-[50px] py-1 px-2 align-middle",
                                    linkedPO && "border-l-2 border-violet-300"
                                  )}>
                                    <LineItemSelector
                                      items={mockGRLines}
                                      value={match?.grLineId}
                                      onSelect={(value) => handleLineItemMatch(index, 'gr', value)}
                                      placeholder="Select line"
                                      type="gr"
                                      lineNumber={match?.grLineId ? parseInt(match.grLineId.split('-').pop() || '0') : undefined}
                                      isEmpty={!match?.grLineId}
                                      formatCurrency={formatCurrency}
                                      currency={invoice.currency_code}
                                      selectedItems={selectedGRItems}
                                    />
                                  </TableCell>
                                  
                                  {/* GR Details */}
                                  <TableCell className="text-sm text-gray-600 h-[50px] py-1 px-2 align-middle">
                                    <div className="truncate w-full" title={grLine?.description || "—"}>
                                      {grLine?.description || "—"}
                                    </div>
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 border-r-2 border-violet-300 align-middle",
                                    !forcedMatchedItems.has(index) && grLine && Number(item.quantity) !== Number(grLine.quantity) && "bg-amber-50"
                                  )}>
                                    {grLine?.quantity || "—"}
                                  </TableCell>
                                </>
                              )}
                              
                              {/* Comments */}
                              <TableCell className="h-[50px] py-1 px-2 text-center align-middle">
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 mx-auto relative">
                                  <MessageCircle className="h-2.5 w-2.5" />
                                  {mockComments[index] && (
                                    <span className="absolute -top-0.5 -right-1 h-3 w-3 bg-gray-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                      {mockComments[index]}
                                    </span>
                                  )}
                                </Button>
                              </TableCell>
                              
                              {/* Actions */}
                              <TableCell className="h-[50px] py-1 px-2 text-center align-middle">
                                <div className="flex items-center justify-center gap-1">
                                  {editingLineItem === index ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-green-100"
                                        onClick={() => handleSaveLineItem(index)}
                                      >
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-red-100"
                                        onClick={handleCancelEditLineItem}
                                      >
                                        <X className="h-3 w-3 text-red-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-violet-100"
                                        onClick={() => handleEditLineItem(index)}
                                      >
                                        <Edit className="h-3 w-3 text-violet-600" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                                            <MoreVertical className="h-3 w-3 text-gray-600" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem onClick={() => handleMarkAsMatched(index)}>
                                            Mark as Matched
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => console.log('Mark as Exception')}>
                                            Mark as Exception
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleRemoveLineItem(index)} className="text-red-600 focus:text-red-600">
                                            Remove Line
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h4 className="font-medium mb-2">No line items found</h4>
                  <p className="text-sm mb-4">Click "Add Item" to add line items for matching.</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddLineItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              )}
              
              {/* Add Item Button - Always visible when there are line items */}
              {invoice?.line_items && invoice.line_items.length > 0 && (
                <div className="p-4 border-t bg-gray-50">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddLineItem}
                    className="hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              )}
            </div>
            
            {/* PO Lines Not Found Section */}
            {false && ( // TODO: Implement PO line items matching
              <div className="border-t">
                <div className="p-3">
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none">
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                      <span className="text-sm font-medium text-gray-900">PO Lines Not Found on Invoice</span>
                      <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0.5">
                        {/* TODO: Calculate from backend data */}
                        {0}
                      </Badge>
                    </summary>
                    <div className="mt-2 pl-4">
                      <div className="text-xs text-gray-600 mb-1">
                        PO-2023-001: 0 items // TODO: Calculate from backend data
                      </div>
                      <div className="space-y-1">
                        {[]
                          // TODO: Get PO line items from backend data
                          .map((poLine: any) => (
                            <div key={poLine.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded text-xs">
                              <span className="font-medium min-w-0 truncate max-w-sm">{poLine.description}</span>
                              <span className="text-gray-500 flex-shrink-0">Qty: {poLine.quantity}</span>
                              <span className="text-gray-500 flex-shrink-0">@ {formatCurrency(poLine.unit_price, invoice?.currency_code)}</span>
                              <span className="text-gray-500 flex-shrink-0 font-medium">= {formatCurrency(poLine.total, invoice?.currency_code)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
