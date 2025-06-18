"use client"

import React, { useState, useEffect, useRef } from "react"
import { ArrowLeft, FileText, Edit, Plus, Download, ChevronRight, ChevronDown, ChevronUp, Maximize, X, Receipt, FileCheck, TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Calendar as CalendarIcon, MoreVertical, MessageCircle, Clock, Info, Check, UserCheck, CreditCard, Link as LinkIcon, Eye, Shield, FileImage, Package, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Sidebar from "@/components/sidebar"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { LineItemSelector } from "@/components/line-item-selector"
import { useInvoiceValidation, validationRules } from "@/hooks/use-invoice-validation"
import { parseMatchingValidation, getFieldMatchStatus } from "@/lib/validation/matching-parser"
import { runCrossFieldValidations, crossFieldValidationRules } from "@/lib/validation/cross-field-validation"

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
    validationRules.overdue(),
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
        const isPOBacked = !!(formData?.po_number)
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
        const isPOBacked = !!(formData?.po_number)
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
  const [exceptionsOpen, setExceptionsOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<{[key: string]: string}>({})
  const [removingVendor, setRemovingVendor] = useState(false)
  const [resolvingIssues, setResolvingIssues] = useState<Set<string>>(new Set())
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set())
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null)
  const [lineItemValues, setLineItemValues] = useState<{[key: number]: Partial<LineItem>}>({})
  const [skuValues, setSkuValues] = useState<{[key: number]: string}>({})
  const [forcedMatchedItems, setForcedMatchedItems] = useState<Set<number>>(new Set())
  const [budgetSectionExpanded, setBudgetSectionExpanded] = useState(false)
  const [workflowStage, setWorkflowStage] = useState<'draft' | 'validation' | 'pending_approval' | 'approved' | 'processing' | 'paid'>('validation')
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false)
  const [currentAssignee, setCurrentAssignee] = useState('SC')
  const [lineItemsSwitch, setLineItemsSwitch] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const descriptionInputRefs = useRef<{[key: number]: HTMLInputElement | null}>({})
  
  // Initialize the validation hook
  const validation = useInvoiceValidation({
    validationRules: invoiceFieldValidation,
    initialData: invoice
  })

  // Trigger validation on component mount for all fields (client-side only)
  const hasRunInitialValidation = useRef(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined' && invoice && !hasRunInitialValidation.current) {
      console.log('Running initial validation for all fields...')
      hasRunInitialValidation.current = true
      
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        Object.keys(invoiceFieldValidation).forEach(async (fieldName) => {
          const invoiceFieldName = getInvoiceFieldName(fieldName)
          const fieldValue = invoice[invoiceFieldName as keyof typeof invoice]
          if (fieldValue) {
            console.log(`Validating ${fieldName} with value:`, fieldValue)
            await validation.validateField(fieldName, fieldValue, invoice)
          }
        })
      }, 100)
    }
  }, [invoice]) // Removed validation from dependencies

  // Mock PO line items for matching
  const mockPOLines = [
    { id: "PO-001-1", po_number: "PO-001", line_number: 1, sku: "CH-002", description: "Office Chair", quantity: 4, unit_price: 75.00, total: 300.00 },
    { id: "PO-001-2", po_number: "PO-001", line_number: 2, sku: "DK-002", description: "Office Desk", quantity: 3, unit_price: 200.00, total: 600.00 },
    { id: "PO-001-3", po_number: "PO-001", line_number: 3, sku: "TV-002", description: "Office TV", quantity: 2, unit_price: 500.00, total: 1000.00 },
    { id: "PO-001-4", po_number: "PO-001", line_number: 4, sku: "SF-001", description: "Office Couch", quantity: 1, unit_price: 750.00, total: 750.00 },
    { id: "PO-001-5", po_number: "PO-001", line_number: 5, sku: "LM-002", description: "Office Lamp", quantity: 5, unit_price: 25.00, total: 125.00 },
    { id: "PO-001-6", po_number: "PO-001", line_number: 6, sku: "WD-001", description: "Office Water Dispenser", quantity: 1, unit_price: 280.00, total: 280.00 },
  ]

  // Mock GR line items for matching
  const mockGRLines = [
    { id: "GR-001-1", line_number: 1, sku: "CH-002", description: "Office Chair", quantity: 4, unit_price: 75.00, total: 300.00, received_date: "2024-12-01" },
    { id: "GR-001-2", line_number: 2, sku: "DK-002", description: "Office Desk", quantity: 3, unit_price: 200.00, total: 600.00, received_date: "2024-12-02" },
    { id: "GR-001-3", line_number: 3, sku: "TV-002", description: "Office TV", quantity: 2, unit_price: 500.00, total: 1000.00, received_date: "2024-12-03" },
    { id: "GR-001-4", line_number: 4, sku: "SF-001", description: "Office Couch", quantity: 1, unit_price: 750.00, total: 750.00, received_date: "2024-12-04" },
    { id: "GR-001-5", line_number: 5, sku: "LM-002", description: "Office Lamp", quantity: 5, unit_price: 25.00, total: 125.00, received_date: "2024-12-05" },
    { id: "GR-001-6", line_number: 6, sku: "WD-001", description: "Office Water Dispenser", quantity: 1, unit_price: 280.00, total: 280.00, received_date: "2024-12-06" },
  ]

  // Mock SKU codes for invoice line items
  const mockSKUCodes = [
    "CH-002",
    "DK-002", 
    "TV-002",
    "SF-001",
    "LM-002",
    "WD-001"
  ]

  // Function to get SKU for a line item
  const getLineItemSKU = (itemIndex: number) => {
    // Check if there's an edited SKU value
    if (skuValues[itemIndex] !== undefined) {
      return skuValues[itemIndex]
    }
    
    // Fall back to mock data
    if (!invoice?.line_items || invoice.line_items.length > 6 || itemIndex >= mockSKUCodes.length) {
      return "—"
    }
    return mockSKUCodes[itemIndex]
  }

  // Handle SKU value change
  const handleSKUValueChange = (index: number, value: string) => {
    setSkuValues(prev => ({
      ...prev,
      [index]: value
    }))
  }

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // Line item matching state
  const [lineItemMatches, setLineItemMatches] = useState<{[key: number]: {poLineId?: string, grLineId?: string}}>({})

  // Check if a row should auto-expand (has mismatches)
  const shouldAutoExpand = (index: number) => {
    const status = getLineItemStatus(index)
    return status === 'mismatch'
  }

  // Initialize auto-expansion for rows with mismatches
  useEffect(() => {
    if (lineItemsSwitch && invoice?.line_items) {
      const autoExpandRows = new Set<number>()
      invoice.line_items.forEach((_, index) => {
        if (shouldAutoExpand(index)) {
          autoExpandRows.add(index)
        }
      })
      setExpandedRows(autoExpandRows)
    }
  }, [lineItemsSwitch, invoice?.line_items, lineItemMatches, forcedMatchedItems])
  
  // Auto-assign PO lines on page load
  useEffect(() => {
    if (invoice?.line_items && invoice.line_items.length > 0 && invoice.line_items.length <= 6) {
      const autoMatches: {[key: number]: {poLineId?: string, grLineId?: string}} = {}
      
      for (let i = 0; i < invoice.line_items.length; i++) {
        autoMatches[i] = {
          poLineId: `PO-001-${i + 1}`
        }
      }
      
      setLineItemMatches(autoMatches)
    }
  }, [invoice?.line_items])
  
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
    const poLine = mockPOLines.find(po => po.id === match.poLineId)
    
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
  
  // State for assignment information from extract-and-match API
  const [assignedUser, setAssignedUser] = useState<any>(null)
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(false)
  
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
      
      // Merge matching issues with existing validation (deduplicated)
      Object.entries(matchingIssues).forEach(([field, issues]) => {
        if (issues.length > 0) {
          const existingIssues = newValidationIssues[field] || []
          const uniqueIssues = issues.filter(newIssue => 
            !existingIssues.some(existingIssue => 
              existingIssue.message === newIssue.message && 
              existingIssue.type === newIssue.type
            )
          )
          newValidationIssues[field] = [
            ...existingIssues,
            ...uniqueIssues
          ]
        }
      })
    }
    
    // Add cross-field validation
    if (invoice) {
      const crossFieldIssues = runCrossFieldValidations(invoice)
      Object.entries(crossFieldIssues).forEach(([field, issues]) => {
        if (issues.length > 0) {
          const existingIssues = newValidationIssues[field] || []
          const uniqueIssues = issues.filter(newIssue => 
            !existingIssues.some(existingIssue => 
              existingIssue.message === newIssue.message && 
              existingIssue.type === newIssue.type
            )
          )
          newValidationIssues[field] = [
            ...existingIssues,
            ...uniqueIssues
          ]
        }
      })
    }
    
    setValidationIssues(newValidationIssues)
  }, [validation.validationState, matchingData, linkedPO, invoice])
  
  // Extract assignment information from matching data
  useEffect(() => {
    if (matchingData?.assignment_info) {
      setIsLoadingAssignment(true)
      
      // Simulate loading delay for demo purposes
      setTimeout(() => {
        setAssignedUser(matchingData.assignment_info)
        
        // Set the current assignee to the AI-suggested person
        setCurrentAssignee('AI')
        
        setIsLoadingAssignment(false)
      }, 1500)
    } else if (matchingData) {
      // If no assignment info in matching data, set default assignment data for demo
      setIsLoadingAssignment(true)
      
      setTimeout(() => {
        // Create demo assignment data based on invoice content for demo
        const demoAssignment = {
          id: 16,
          username: "lisa.davis",
          full_name: "Lisa Davis", 
          department: "Operations",
          email: "lisa.davis@company.com",
          rule: {
            id: 3,
            name: "Office Furniture",
            description: "If an invoice is for office furniture such as chairs desks or sofas",
            department: "Operations",
            priority: 11
          },
          confidence: 0.95,
          explanation: "This rule directly matches the invoice content. The invoice contains multiple office furniture items including chairs, desks, and a couch, which are explicitly mentioned in the rule description."
        }
        
        setAssignedUser(demoAssignment)
        
        // Set the current assignee to the AI-suggested person
        setCurrentAssignee('AI')
        
        setIsLoadingAssignment(false)
      }, 1500)
    }
  }, [matchingData])
  
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
    
    // Count header field matches
    fields.forEach(field => {
      if (comparisons[field]) {
        total++
        if (comparisons[field].result === 'perfect_match') {
          matched++
        }
      }
    })
    
    // Add line items if available - use actual line item matching status
    if (invoice?.line_items) {
      total += invoice.line_items.length
      
      // Count actually matched line items based on their status
      invoice.line_items.forEach((_, index) => {
        const status = getLineItemStatus(index)
        if (status === 'matched') {
          matched++
        }
      })
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
    
    // If no stats available, return not validated
    if (stats.total === 0) {
      return {
        text: 'Not Validated',
        className: 'bg-gray-50 text-gray-700 border-gray-200'
      }
    }
    
    // Calculate match percentage
    const matchPercentage = (stats.matched / stats.total) * 100
    
    // Determine status based on actual line item matching
    if (matchPercentage === 100) {
      return {
        text: 'Perfect Match',
        className: 'bg-green-50 text-green-700 border-green-200'
      }
    } else if (matchPercentage >= 90) {
      return {
        text: 'Within Tolerance',
        className: 'bg-green-25 text-green-600 border-green-100'
      }
    } else if (matchPercentage >= 70) {
      return {
        text: 'Partial Match',
        className: 'bg-amber-50 text-amber-700 border-amber-200'
      }
    } else if (matchPercentage >= 50) {
      return {
        text: 'Poor Match',
        className: 'bg-red-50 text-red-700 border-red-200'
      }
    } else {
      return {
        text: 'Mismatch',
        className: 'bg-red-100 text-red-800 border-red-300'
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
    // Use comprehensive validation issues that include PO matching
    const fieldIssues = validationIssues[fieldKey] || []
    const matchStatus = getFieldMatchStatus(matchingData, fieldKey)
    
    // Show loading indicator if validating
    if (fieldValidation.isValidating) {
      return (
        <div className="ml-2">
          <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    
    // Show badges for matched fields
    if ((!fieldIssues || fieldIssues.length === 0) && matchStatus === 'matched') {
      return (
        <div className="ml-2 inline-flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex">
                  <CheckCircle className="h-4 w-4 text-green-500 cursor-help" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Matched with PO</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    }
    
    // Show green checkmark for fields with no issues
    if (!fieldIssues || fieldIssues.length === 0) {
      return (
        <div className="ml-2 inline-flex items-center">
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
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
                    "w-full text-sm text-gray-900 py-2 px-3 pr-10 rounded-md border transition-all duration-200 focus:outline-none focus:border-violet-500 resize-none overflow-y-auto",
                    fieldName === "billingAddress" ? "h-[100px]" : "h-20",
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
              <div className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 flex items-center",
                multiline && fieldName === "billingAddress" ? "top-[11px] translate-y-0" : ""
              )}>
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
                "relative text-sm py-2 pl-3 pr-10 rounded-md border transition-all duration-200 cursor-text flex",
                multiline ? "min-h-[40px] items-start" : "h-[40px] items-center",
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <Edit className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div data-validation-indicator className="flex items-center">{renderValidationIndicator(fieldName)}</div>
                  </div>
                </>
              ) : multiline ? (
                <div className={cn(
                  "flex-1 overflow-y-auto pr-2",
                  fieldName === "billingAddress" ? "h-[100px]" : "h-20"
                )}>
                  <span className={cn(
                    !value ? "text-gray-400" : "text-gray-900",
                    "whitespace-pre-wrap"
                  )}>
                    {value || placeholder}
                  </span>
                </div>
              ) : (
                <span className={cn(
                  "flex-1 truncate pr-2",
                  !value ? "text-gray-400" : "text-gray-900"
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
              <div className={cn(
                "absolute right-3 flex items-center gap-0.5",
                multiline && fieldName === "billingAddress" ? "top-[11px] translate-y-0" : "top-1/2 -translate-y-1/2"
              )}>
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
                    ${currentAssignee === 'AI' 
                      ? 'bg-violet-500' 
                      : assigneeOptions.find(a => a.initials === currentAssignee)?.color || 'bg-violet-500'}
                  `}
                  title="Click to reassign"
                >
                  {currentAssignee === 'AI' 
                    ? (assignedUser?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'AI')
                    : currentAssignee}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {/* AI Assignment Section */}
                {assignedUser && !isLoadingAssignment && (
                  <>
                    <div className="px-3 py-2 border-b bg-gradient-to-r from-violet-50 to-blue-50">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-violet-100 rounded">
                          <svg className="h-3 w-3 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-violet-700">AI Assignment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-medium">
                          {assignedUser.full_name?.split(' ').map((n: string) => n[0]).join('') || 'LD'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{assignedUser.full_name}</p>
                          <p className="text-xs text-gray-500">{assignedUser.department}</p>
                        </div>
                      </div>
                      {assignedUser.rule && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-xs font-medium text-gray-700 mb-1">Matched Rule: {assignedUser.rule.name}</p>
                          <p className="text-[10px] text-gray-600 line-clamp-2">{assignedUser.explanation}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {/* Loading State */}
                {isLoadingAssignment && (
                  <div className="px-3 py-3 border-b bg-gradient-to-r from-violet-50 to-blue-50">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-violet-700">AI is analyzing assignment...</span>
                    </div>
                  </div>
                )}
                
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                  {assignedUser && !isLoadingAssignment ? 'Override assignment:' : 'Assign to:'}
                </div>
                
                {/* AI Suggested User - Top of List */}
                {assignedUser && !isLoadingAssignment && (
                  <DropdownMenuItem
                    key="AI"
                    className="gap-3 py-2 bg-violet-50 hover:bg-violet-100"
                    onClick={() => setCurrentAssignee('AI')}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-violet-500 text-white rounded-full text-xs font-medium">
                      {assignedUser.full_name?.split(' ').map((n: string) => n[0]).join('') || 'AI'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{assignedUser.full_name}</p>
                      <p className="text-xs text-violet-600">AI Suggested • {assignedUser.department}</p>
                    </div>
                    {currentAssignee === 'AI' && (
                      <Check className="h-4 w-4 text-green-600 ml-auto" />
                    )}
                  </DropdownMenuItem>
                )}
                
                {/* Separator if AI user exists */}
                {assignedUser && !isLoadingAssignment && (
                  <div className="border-t my-1"></div>
                )}
                
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
                        
                        {/* Exceptions Button */}
                        {getIssueCounts().total > 0 && (
                          <Sheet open={exceptionsOpen} onOpenChange={setExceptionsOpen}>
                            <SheetTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "text-xs font-medium px-3 py-1.5 h-auto",
                                  getIssueCounts().errors > 0 
                                    ? "border-red-200 text-red-700 bg-red-50 hover:bg-red-100" 
                                    : "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                )}
                              >
                                <AlertCircle className="h-3 w-3 mr-1.5" />
                                {getIssueCounts().total} Exception{getIssueCounts().total !== 1 ? 's' : ''}
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[500px] sm:w-[600px]">
                              <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-amber-600" />
                                  Validation Issues
                                </SheetTitle>
                                <SheetDescription>
                                  Review and resolve the following issues with this invoice
                                </SheetDescription>
                              </SheetHeader>
                              
                              <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {Object.entries(validationIssues)
                                  .filter(([_, issues]) => issues.length > 0)
                                  .map(([fieldKey, issues]) => (
                                    <div key={fieldKey} className="border rounded-lg p-4">
                                      <h4 className="font-medium text-gray-900 mb-2">
                                        {getFieldDisplayName(fieldKey)}
                                      </h4>
                                      
                                      <div className="space-y-2">
                                        {issues.map((issue, index) => {
                                          const issueId = `${fieldKey}-${index}`
                                          const isResolving = resolvingIssues.has(issueId)
                                          const isResolved = resolvedIssues.has(issueId)
                                          
                                          return (
                                            <div
                                              key={index}
                                              className={cn(
                                                "flex items-start gap-3 p-3 rounded-md transition-all duration-500",
                                                issue.type === 'error' && "bg-red-50 border border-red-200",
                                                issue.type === 'warning' && "bg-amber-50 border border-amber-200",
                                                issue.type === 'info' && "bg-blue-50 border border-blue-200",
                                                isResolved && "opacity-0 transform translate-x-full"
                                              )}
                                            >
                                              <div className="flex-shrink-0 mt-0.5">
                                                {issue.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                                                {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                                                {issue.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
                                              </div>
                                              
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900">{issue.message}</p>
                                                {issue.action && (
                                                  <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="px-0 py-1 h-auto text-xs"
                                                    onClick={issue.action.onClick}
                                                  >
                                                    {issue.action.label}
                                                  </Button>
                                                )}
                                              </div>
                                              
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-200"
                                                onClick={() => handleResolveIssue(fieldKey, index)}
                                                disabled={isResolving}
                                              >
                                                {isResolving ? (
                                                  <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                  <X className="h-3 w-3" />
                                                )}
                                              </Button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                
                                {Object.keys(validationIssues).length === 0 && (
                                  <div className="text-center py-8 text-gray-500">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                                    <p>No validation issues found</p>
                                  </div>
                                )}
                              </div>
                            </SheetContent>
                          </Sheet>
                        )}
                      </div>

                      <div className="space-y-5">
                        {/* GENERAL INFO Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoice Header</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          {/* Critical matching fields */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
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

                        {/* PAYMENT SCHEDULE Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment Schedule</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <EditableField
                              fieldName="date"
                              label="Invoice Date"
                              value={invoice?.date || ''}
                              type="date"
                            />
                            <EditableField
                              fieldName="dueDate"
                              label="Due Date"
                              value={invoice?.due_date || ''}
                              type="date"
                            />
                          </div>
                        </div>

                        {/* FINANCIAL Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Financial Details</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="space-y-3">
                            {/* Row 1: Total Amount, Currency */}
                            <div className="grid grid-cols-2 gap-3">
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
                            <div className="grid grid-cols-2 gap-3">
                              <EditableField
                                fieldName="subtotalAmount"
                                label="Subtotal"
                                value={invoice?.subtotal?.toString() || (invoice?.amount && invoice?.tax_amount ? (invoice.amount - invoice.tax_amount).toFixed(2) : '')}
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
                            <div className="grid grid-cols-2 gap-3">
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

                        {/* PAYMENT Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment Information</span>
                            <div className="flex-1 h-[2px] bg-gray-200"></div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* Left Column - Payment Method and Payment Terms */}
                            <div className="space-y-3">
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
                            </div>
                            
                            {/* Right Column - Billing Address */}
                            <EditableField
                              fieldName="billingAddress"
                              label="Billing Address"
                              value={invoice?.billing_address || ''}
                              multiline={true}
                            />
                          </div>
                          
                          {/* Conditional fields for non-PO invoices */}
                          {!isPOBacked && (
                            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center">
                <Switch
                  checked={lineItemsSwitch}
                  onCheckedChange={setLineItemsSwitch}
                />
              </div>
            </div>

            <div className="relative overflow-hidden">
              {invoice?.line_items && invoice.line_items.length > 0 ? (
                !lineItemsSwitch ? (
                  /* Current Table Layout */
                <div className="flex">
                  {/* Frozen Invoice Columns */}
                  <div className="flex-shrink-0 bg-white z-10 shadow-sm" style={{ boxShadow: '4px 0 8px -2px rgba(0, 0, 0, 0.1)' }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 h-auto">
                          <TableHead className="w-8 text-center text-xs font-medium py-2 px-2">#</TableHead>
                          <TableHead className="w-20 text-xs font-medium py-2 px-2">Status</TableHead>
                          <TableHead className="w-28 text-xs font-medium py-2 px-2">SKU</TableHead>
                          <TableHead className="w-56 text-xs font-medium py-2 px-2">Description<br/>(Invoice)</TableHead>
                          <TableHead className="w-14 text-right text-xs font-medium py-2 px-2">Qty</TableHead>
                          <TableHead className="w-18 text-right text-xs font-medium py-2 px-2">Unit<br/>Price</TableHead>
                          <TableHead className="w-18 text-right text-xs font-medium py-2 px-2 pr-4 border-r-2 border-violet-300">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.line_items.map((item, index) => {
                          const status = getLineItemStatus(index)
                          const match = lineItemMatches[index]
                          const poLine = match?.poLineId ? mockPOLines.find(po => po.id === match.poLineId) : null
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
                                    value={skuValues[index] !== undefined ? skuValues[index] : getLineItemSKU(index)}
                                    onChange={(e) => handleSKUValueChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm px-2 py-1"
                                    placeholder="Enter SKU"
                                  />
                                ) : (
                                  <div className="truncate max-w-26" title={getLineItemSKU(index) === "—" ? "SKU not available" : getLineItemSKU(index)}>
                                    {getLineItemSKU(index)}
                                  </div>
                                )}
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
                                  <div className="truncate max-w-52" title={item.description}>
                                    {item.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right text-sm h-[50px] py-1 px-2 align-middle",
                                !forcedMatchedItems.has(index) && ((poLine && Number(item.quantity) !== Number(poLine.quantity)) || (grLine && Number(item.quantity) !== Number(grLine.quantity))) && "bg-red-50 border border-red-400"
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
                                  Number(item.quantity).toFixed(2)
                                )}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right text-sm h-[50px] py-1 px-2 align-middle",
                                !forcedMatchedItems.has(index) && (poLine && Number(item.unit_price) !== Number(poLine.unit_price)) && "bg-red-50 border border-red-400"
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
                              <TableCell className="text-right text-sm h-[50px] py-1 px-2 pr-4 border-r-2 border-violet-300 align-middle">
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
                        <TableRow className="bg-gray-50 h-12">
                          {linkedPO && (
                            <>
                              <TableHead className="min-w-[70px] text-xs font-medium py-2 px-2 pl-4" title="Purchase Order Line Source">PO Line</TableHead>
                              <TableHead className="min-w-[70px] text-xs font-medium py-2 px-2" title="Purchase Order SKU">PO SKU</TableHead>
                              <TableHead className="min-w-[140px] text-xs font-medium py-2 px-2" title="Purchase Order Description">PO Description</TableHead>
                              <TableHead className="min-w-[50px] text-right text-xs font-medium py-2 px-2 whitespace-nowrap" title="Purchase Order Quantity">PO Qty</TableHead>
                              <TableHead className="min-w-[70px] text-right text-xs font-medium py-2 px-2" title="Purchase Order Unit Price">PO Price</TableHead>
                              <TableHead className={cn(
                                "min-w-[70px] text-right text-xs font-medium py-2 px-2 pr-4",
                                !linkedGR && "border-r-2 border-violet-300"
                              )} title="Purchase Order Total">PO Total</TableHead>
                            </>
                          )}
                          {linkedGR && (
                            <>
                              <TableHead className={cn(
                                "min-w-[70px] text-xs font-medium py-2 px-2 pl-4",
                                linkedPO && "border-l-2 border-violet-300"
                              )} title="Goods Receipt Line Source">GR Line</TableHead>
                              <TableHead className="min-w-[140px] text-xs font-medium py-2 px-2" title="Goods Receipt Description">GR Description</TableHead>
                              <TableHead className="min-w-[50px] text-right text-xs font-medium py-2 px-2 pr-4 border-r-2 border-violet-300 whitespace-nowrap" title="Goods Receipt Quantity">GR Qty</TableHead>
                            </>
                          )}
                          <TableHead className={cn(
                            "text-center text-xs font-medium py-2 px-2",
                            !linkedPO && !linkedGR ? "w-full" : "min-w-[80px]"
                          )}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.line_items.map((item, index) => {
                          const match = lineItemMatches[index]
                          const poLine = match?.poLineId ? mockPOLines.find(po => po.id === match.poLineId) : null
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
                                  <TableCell className="h-[50px] py-1 px-2 pl-4 align-middle">
                                    <LineItemSelector
                                      items={mockPOLines}
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
                                  
                                  {/* PO SKU */}
                                  <TableCell className="text-sm text-gray-600 h-[50px] py-1 px-2 align-middle">
                                    <div className="truncate w-full" title={poLine?.sku || "—"}>
                                      {poLine?.sku || "—"}
                                    </div>
                                  </TableCell>
                                  
                                  {/* PO Details */}
                                  <TableCell className="text-sm text-gray-600 h-[50px] py-1 px-2 align-middle">
                                    <div className="truncate w-full" title={poLine?.description || "—"}>
                                      {poLine?.description || "—"}
                                    </div>
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 align-middle",
                                    !forcedMatchedItems.has(index) && poLine && Number(item.quantity) !== Number(poLine.quantity) && "bg-red-50 border border-red-400"
                                  )}>
                                    {poLine?.quantity || "—"}
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 align-middle",
                                    !forcedMatchedItems.has(index) && poLine && Number(item.unit_price) !== Number(poLine.unit_price) && "bg-red-50 border border-red-400"
                                  )}>
                                    {poLine ? formatCurrency(poLine.unit_price, invoice.currency_code) : "—"}
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 pr-4 align-middle",
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
                                    "h-[50px] py-1 px-2 pl-4 align-middle",
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
                                    "text-right text-sm text-gray-600 h-[50px] py-1 px-2 pr-4 border-r-2 border-violet-300 align-middle",
                                    !forcedMatchedItems.has(index) && grLine && Number(item.quantity) !== Number(grLine.quantity) && "bg-red-50 border border-red-400"
                                  )}>
                                    {grLine?.quantity || "—"}
                                  </TableCell>
                                </>
                              )}
                              
                              {/* Actions */}
                              <TableCell className="h-[50px] py-1 px-2 text-center align-middle">
                                <div className="flex items-center justify-center gap-1">
                                  {editingLineItem === index ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-violet-100"
                                        onClick={() => handleSaveLineItem(index)}
                                      >
                                        <CheckCircle className="h-3 w-3 text-violet-600" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-violet-100"
                                        onClick={handleCancelEditLineItem}
                                      >
                                        <X className="h-3 w-3 text-violet-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-violet-100 relative"
                                        title="Comments"
                                      >
                                        <MessageCircle className="h-3 w-3 text-violet-600" />
                                        {mockComments[index] && (
                                          <span className="absolute top-0 right-0 h-3 w-3 bg-violet-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                            {mockComments[index]}
                                          </span>
                                        )}
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-violet-100"
                                        onClick={() => handleEditLineItem(index)}
                                        title="Edit"
                                      >
                                        <Edit className="h-3 w-3 text-violet-600" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-violet-100" title="More options">
                                            <MoreVertical className="h-3 w-3 text-violet-600" />
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
                  /* Expandable Row Layout */
                  <div className="space-y-0">
                    {/* Header Row */}
                    <div className="bg-gray-50 border-b px-4 py-3">
                      <div className="grid grid-cols-12 gap-4 items-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                        <div className="col-span-1"></div>
                        <div className="col-span-1">#</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-1">SKU</div>
                        <div className="col-span-3">Description</div>
                        <div className="col-span-1 text-right">Qty</div>
                        <div className="col-span-1 text-right">Unit Price</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1 text-center">Actions</div>
                      </div>
                    </div>
                    
                    {/* Invoice Line Items */}
                    {invoice.line_items.map((item, index) => {
                      const status = getLineItemStatus(index)
                      const match = lineItemMatches[index]
                      const poLine = match?.poLineId ? mockPOLines.find(po => po.id === match.poLineId) : null
                      const grLine = match?.grLineId ? mockGRLines.find(gr => gr.id === match.grLineId) : null
                      const isExpanded = expandedRows.has(index)
                      const hasMismatch = status === 'mismatch'
                      
                      // Auto-expand rows with mismatches if not manually controlled
                      if (hasMismatch && !expandedRows.has(index) && !expandedRows.has(-index-1)) {
                        expandedRows.add(index)
                      }
                      
                      // Show expansion possibility if there are any PO/GR lines available or already matched
                      const canExpand = poLine || grLine || mockPOLines.length > 0 || mockGRLines.length > 0
                      
                      return (
                        <div 
                          key={index} 
                          className={cn(
                            "border-b group transition-all duration-200 mx-2",
                            "hover:shadow-[0_0_0_2px_rgb(156,163,175)] hover:rounded-sm"
                          )}
                        >
                          {/* Main Invoice Row */}
                          <div 
                            className={cn(
                              "px-2 py-3 hover:bg-gray-50 transition-colors cursor-pointer",
                              hasMismatch && "bg-amber-25 border-l-4 border-amber-400"
                            )}
                            onClick={() => {
                              if (canExpand && editingLineItem !== index) {
                                const newExpanded = new Set(expandedRows)
                                if (isExpanded) {
                                  newExpanded.delete(index)
                                  newExpanded.add(-index-1) // Mark as manually collapsed
                                } else {
                                  newExpanded.add(index)
                                  newExpanded.delete(-index-1) // Remove manual collapse mark
                                }
                                setExpandedRows(newExpanded)
                              }
                            }}
                          >
                            <div className="grid grid-cols-12 gap-4 items-center">
                              {/* Chevron Toggle */}
                              <div className="col-span-1 w-6">
                                {canExpand && (
                                  <ChevronRight className={cn(
                                    "h-3 w-3 transition-transform text-gray-400",
                                    isExpanded && "rotate-90"
                                  )} />
                                )}
                              </div>
                              
                              {/* Row Number */}
                              <div className="col-span-1 text-sm font-medium text-gray-600">
                                {index + 1}
                              </div>
                              
                              {/* Status */}
                              <div className="col-span-1">
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs font-medium px-2 py-1",
                                    status === 'matched' && "bg-green-100 text-green-700 hover:bg-green-100",
                                    status === 'mismatch' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                    status === 'missing' && "bg-red-100 text-red-700 hover:bg-red-100"
                                  )}
                                >
                                  {status === 'matched' ? 'Matched' : status === 'mismatch' ? 'Variance' : 'Unmatched'}
                                </Badge>
                              </div>
                              
                              {/* SKU */}
                              <div className="col-span-1 text-sm font-medium">
                                {editingLineItem === index ? (
                                  <Input
                                    value={skuValues[index] !== undefined ? skuValues[index] : getLineItemSKU(index)}
                                    onChange={(e) => handleSKUValueChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm px-2 py-1"
                                    placeholder="Enter SKU"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div className="truncate max-w-20" title={getLineItemSKU(index) === "—" ? "SKU not available" : getLineItemSKU(index)}>
                                    {getLineItemSKU(index)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Description */}
                              <div className="col-span-3 text-sm font-medium">
                                {editingLineItem === index ? (
                                  <Input
                                    ref={(el) => { descriptionInputRefs.current[index] = el }}
                                    value={lineItemValues[index]?.description || ''}
                                    onChange={(e) => handleLineItemValueChange(index, 'description', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm px-2 py-1"
                                    placeholder="Enter description"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div className="truncate" title={item.description}>
                                    {item.description}
                                  </div>
                                )}
                              </div>
                              
                              {/* Quantity */}
                              <div className={cn(
                                "col-span-1 text-right text-sm font-medium",
                                !forcedMatchedItems.has(index) && ((poLine && Number(item.quantity) !== Number(poLine.quantity)) || (grLine && Number(item.quantity) !== Number(grLine.quantity))) && "text-red-600"
                              )}>
                                {editingLineItem === index ? (
                                  <Input
                                    type="number"
                                    value={lineItemValues[index]?.quantity || ''}
                                    onChange={(e) => handleLineItemValueChange(index, 'quantity', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm px-2 py-1 text-right"
                                    placeholder="0.00"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  Number(item.quantity).toFixed(2)
                                )}
                              </div>
                              
                              {/* Unit Price */}
                              <div className={cn(
                                "col-span-1 text-right text-sm font-medium",
                                !forcedMatchedItems.has(index) && ((poLine && Number(item.unit_price) !== Number(poLine.unit_price)) || (grLine && Number(item.unit_price) !== Number(grLine.unit_price))) && "text-red-600"
                              )}>
                                {editingLineItem === index ? (
                                  <Input
                                    type="number"
                                    value={lineItemValues[index]?.unit_price || ''}
                                    onChange={(e) => handleLineItemValueChange(index, 'unit_price', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="h-8 text-sm px-2 py-1 text-right"
                                    placeholder="0.00"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  `$${Number(item.unit_price).toFixed(2)}`
                                )}
                              </div>
                              
                              {/* Total */}
                              <div className={cn(
                                "col-span-2 text-right text-sm font-medium",
                                !forcedMatchedItems.has(index) && ((poLine && Number(item.total) !== Number(poLine.total)) || (grLine && Number(item.total) !== Number(grLine.total))) && "text-red-600"
                              )}>
                                {editingLineItem === index ? (
                                  `$${((Number(lineItemValues[index]?.quantity) || 0) * (Number(lineItemValues[index]?.unit_price) || 0)).toFixed(2)}`
                                ) : (
                                  `$${Number(item.total).toFixed(2)}`
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="col-span-1 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {editingLineItem === index ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-green-100"
                                        onClick={() => handleSaveLineItem(index)}
                                      >
                                        <Check className="h-3 w-3 text-green-600" />
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
                                        className="h-6 w-6 p-0 hover:bg-violet-100 relative"
                                        title="Comments"
                                      >
                                        <MessageCircle className="h-3 w-3 text-violet-600" />
                                        {mockComments[index] && (
                                          <span className="absolute -top-1 -right-1 h-3 w-3 bg-violet-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                            {mockComments[index]}
                                          </span>
                                        )}
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:bg-violet-100"
                                        onClick={() => handleEditLineItem(index)}
                                        title="Edit"
                                      >
                                        <Edit className="h-3 w-3 text-violet-600" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-violet-100" title="More options">
                                            <MoreVertical className="h-3 w-3 text-violet-600" />
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
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded PO/GR Data */}
                          {isExpanded && canExpand && (
                            <div className="bg-gray-50 border-t px-2 py-2">
                              <div className="space-y-1">
                                {/* PO Line Details or Add PO Placeholder */}
                                {poLine ? (
                                  <div className="bg-white/70 border border-blue-150 rounded p-2">
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                      <div className="col-span-2">
                                        <LineItemSelector
                                          value={match?.poLineId}
                                          items={mockPOLines.filter(line => {
                                            const selectedPOItems = Object.values(lineItemMatches)
                                              .map(match => match.poLineId)
                                              .filter(Boolean)
                                            return !selectedPOItems.includes(line.id) || line.id === match?.poLineId
                                          })}
                                          onSelect={(lineId) => {
                                            const newMatches = {...lineItemMatches}
                                            newMatches[index] = {
                                              ...newMatches[index],
                                              poLineId: lineId
                                            }
                                            setLineItemMatches(newMatches)
                                          }}
                                          type="po"
                                          lineNumber={poLine.line_number}
                                          placeholder={`PO ${mockPOLines.find(po => po.id === match?.poLineId)?.po_number || 'PO-001'} #${poLine.line_number}`}
                                        />
                                      </div>
                                      <div className="col-span-1">
                                        <Badge 
                                          variant="secondary" 
                                          className="bg-blue-75 text-blue-600 hover:bg-blue-75 text-xs font-medium px-2 py-1"
                                        >
                                          PO Line
                                        </Badge>
                                      </div>
                                      <div className="col-span-1 text-blue-700 text-sm font-medium">
                                        {poLine.sku}
                                      </div>
                                      <div className="col-span-3 text-blue-700 text-sm font-medium truncate">
                                        {poLine.description}
                                      </div>
                                      <div className={cn(
                                        "col-span-1 text-right text-sm font-medium",
                                        Number(item.quantity) !== Number(poLine.quantity) ? "text-red-600" : "text-blue-700"
                                      )}>
                                        {Number(poLine.quantity).toFixed(2)}
                                      </div>
                                      <div className={cn(
                                        "col-span-1 text-right text-sm font-medium",
                                        Number(item.unit_price) !== Number(poLine.unit_price) ? "text-red-600" : "text-blue-700"
                                      )}>
                                        ${Number(poLine.unit_price).toFixed(2)}
                                      </div>
                                      <div className={cn(
                                        "col-span-2 text-right text-sm font-medium",
                                        Number(item.total) !== Number(poLine.total) ? "text-red-600" : "text-blue-700"
                                      )}>
                                        ${Number(poLine.total).toFixed(2)}
                                      </div>
                                      <div className="col-span-1"></div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-white/70 border border-blue-150 rounded p-2">
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                      <div className="col-span-2">
                                        <LineItemSelector
                                          value={undefined}
                                          items={mockPOLines.filter(line => {
                                            const selectedPOItems = Object.values(lineItemMatches)
                                              .map(match => match.poLineId)
                                              .filter(Boolean)
                                            return !selectedPOItems.includes(line.id)
                                          })}
                                          onSelect={(lineId) => {
                                            const newMatches = {...lineItemMatches}
                                            newMatches[index] = {
                                              ...newMatches[index],
                                              poLineId: lineId
                                            }
                                            setLineItemMatches(newMatches)
                                          }}
                                          type="po"
                                          placeholder="+ Add PO"
                                          isEmpty={true}
                                        />
                                      </div>
                                      <div className="col-span-10 text-blue-500 text-sm font-medium">
                                        Click to add a PO line item
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* GR Line Details */}
                                {grLine && (
                                  <div className="bg-green-25 border border-green-150 rounded p-2">
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                      <div className="col-span-1 w-6">
                                        <LineItemSelector
                                          value={match?.grLineId}
                                          items={mockGRLines.filter(line => {
                                            const selectedGRItems = Object.values(lineItemMatches)
                                              .map(match => match.grLineId)
                                              .filter(Boolean)
                                            return !selectedGRItems.includes(line.id) || line.id === match?.grLineId
                                          })}
                                          onSelect={(lineId) => {
                                            const newMatches = {...lineItemMatches}
                                            newMatches[index] = {
                                              ...newMatches[index],
                                              grLineId: lineId
                                            }
                                            setLineItemMatches(newMatches)
                                          }}
                                          type="gr"
                                          lineNumber={grLine.line_number}
                                        />
                                      </div>
                                      <div className="col-span-1 text-green-500 text-sm font-medium">
                                        {grLine.line_number}
                                      </div>
                                      <div className="col-span-1">
                                        <Badge 
                                          variant="secondary" 
                                          className="bg-green-75 text-green-600 hover:bg-green-75 text-xs font-medium px-2 py-1"
                                        >
                                          Received
                                        </Badge>
                                      </div>
                                      <div className="col-span-1 text-green-700 text-sm font-medium">
                                        {grLine.sku}
                                      </div>
                                      <div className="col-span-3 text-green-700 text-sm font-medium truncate">
                                        {grLine.description}
                                      </div>
                                      <div className={cn(
                                        "col-span-1 text-right text-sm font-medium",
                                        Number(item.quantity) !== Number(grLine.quantity) ? "text-red-600" : "text-green-700"
                                      )}>
                                        {Number(grLine.quantity).toFixed(2)}
                                      </div>
                                      <div className={cn(
                                        "col-span-1 text-right text-sm font-medium",
                                        Number(item.unit_price) !== Number(grLine.unit_price) ? "text-red-600" : "text-green-700"
                                      )}>
                                        ${Number(grLine.unit_price).toFixed(2)}
                                      </div>
                                      <div className={cn(
                                        "col-span-2 text-right text-sm font-medium",
                                        Number(item.total) !== Number(grLine.total) ? "text-red-600" : "text-green-700"
                                      )}>
                                        ${Number(grLine.total).toFixed(2)}
                                      </div>
                                      <div className="col-span-1"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
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
              
              {/* Summary Section */}
              {invoice?.line_items && invoice.line_items.length > 0 && (
                <div className="border-t bg-gray-50/50">
                  <div className="px-4 py-3">
                    <div className="flex justify-end">
                      <div className="w-80 space-y-2">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">
                            {formatCurrency(invoice.subtotal || (invoice.amount - (invoice.tax_amount || 0)), invoice.currency_code)}
                          </span>
                        </div>
                        
                        {/* Tax */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Tax ({invoice.tax_rate ? `${invoice.tax_rate}%` : 'VAT'}):
                          </span>
                          <span className="font-medium">
                            {formatCurrency(invoice.tax_amount || 0, invoice.currency_code)}
                          </span>
                        </div>
                        
                        {/* Shipping (placeholder - you can add this field to your invoice data) */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium">
                            {formatCurrency(0, invoice.currency_code)}
                          </span>
                        </div>
                        
                        {/* Divider */}
                        <div className="border-t border-gray-300 my-2"></div>
                        
                        {/* Total */}
                        <div className="flex items-center justify-between text-base font-semibold">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">
                            {formatCurrency(invoice.amount, invoice.currency_code)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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
