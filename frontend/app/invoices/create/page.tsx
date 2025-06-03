"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, FileText, Edit, Plus, Download, ChevronLeft, ChevronRight, Maximize, X, Receipt, FileCheck, TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Calendar as CalendarIcon, Copy, List, MoreVertical, MessageCircle, Save, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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

interface InvoiceData {
  document_type: string;
  invoices: Invoice[];
}

interface Invoice {
  number: string;
  po_number: string;
  amount: number;
  tax_amount: number;
  currency_code: string;
  date: string;
  due_date: string;
  payment_term_days: number;
  vendor: string;
  line_items: LineItem[];
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
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
  const [validationIssues, setValidationIssues] = useState<{[key: string]: ValidationIssue[]}>({})
  const [isIssuesDrawerOpen, setIsIssuesDrawerOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<{[key: string]: string}>({})
  const [removingVendor, setRemovingVendor] = useState(false)
  const [resolvingIssues, setResolvingIssues] = useState<Set<string>>(new Set())
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set())
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null)
  const [lineItemValues, setLineItemValues] = useState<{[key: number]: Partial<LineItem>}>({})
  const [forcedMatchedItems, setForcedMatchedItems] = useState<Set<number>>(new Set())
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const descriptionInputRefs = useRef<{[key: number]: HTMLInputElement | null}>({})

  // Mock PO data for validation
  const mockPOData = {
    vendor: "Globex Corporation",
    expectedDate: "2024-01-15",
    maxAmount: 2500.00,
    currency: "USD",
    invoiceNumber: "INV-002"
  }

  // Mock PO line items for matching
  const mockPOLines = [
    { id: "PO-001-1", description: "Professional consulting services", quantity: 10, unit_price: 150.00, total: 1500.00 },
    { id: "PO-001-2", description: "Software development services", quantity: 8, unit_price: 200.00, total: 1600.00 },
    { id: "PO-001-3", description: "Project management services", quantity: 5, unit_price: 175.00, total: 875.00 },
    { id: "PO-001-4", description: "Technical documentation", quantity: 2, unit_price: 100.00, total: 200.00 },
  ]

  // Mock GR line items for matching
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
    if (!invoice?.line_items) return { total: 0, matched: 0, mismatched: 0, missing: 0 }
    
    const stats = { total: 0, matched: 0, mismatched: 0, missing: 0 }
    
    invoice.line_items.forEach((_, index) => {
      stats.total++
      const status = getLineItemStatus(index)
      if (status === 'matched') stats.matched++
      else if (status === 'mismatch') stats.mismatched++
      else stats.missing++
    })
    
    return stats
  }

  useEffect(() => {
    // Retrieve the extracted data from sessionStorage
    const storedData = sessionStorage.getItem("extractedInvoiceData")
    if (storedData) {
      const parsedData = JSON.parse(storedData) as InvoiceData
      setExtractedData(parsedData)
      
      // Set the first invoice as the current one
      if (parsedData.invoices && parsedData.invoices.length > 0) {
        setInvoice(parsedData.invoices[0])
        // Initialize linked PO state
        setLinkedPO(parsedData.invoices[0].po_number)
        // Initialize with a sample GR for demonstration
        setLinkedGR("GR-2023-001")
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

  // Validation logic
  useEffect(() => {
    if (!invoice || !linkedPO) {
      setValidationIssues({})
      return
    }

    const issues: {[key: string]: ValidationIssue[]} = {}

    // Invoice Number validation
    const invoiceIssues: ValidationIssue[] = []
    if (invoice.number !== mockPOData.invoiceNumber) {
      invoiceIssues.push({
        type: 'warning',
        message: `Invoice number doesn't match PO expectation (${mockPOData.invoiceNumber})`
      })
    }
    // Add a duplicate check example
    invoiceIssues.push({
      type: 'error',
      message: 'Potential duplicate: Similar invoice found in system',
      action: {
        label: 'View Similar',
        onClick: () => console.log('View similar invoice')
      }
    })
    if (invoiceIssues.length > 0) issues.invoiceNumber = invoiceIssues

    // Vendor validation
    if (invoice.vendor && invoice.vendor !== mockPOData.vendor) {
      const vendorIssues: ValidationIssue[] = []
      
      // PO mismatch warning
      vendorIssues.push({
        type: 'warning',
        message: `Vendor mismatch: PO expects "${mockPOData.vendor}"`,
        action: {
          label: 'Use PO Vendor',
          onClick: () => console.log('Copy PO vendor')
        }
      })
      
      // Vendor not validated warning
      vendorIssues.push({
        type: 'warning',
        message: 'Vendor is not validated in the system',
        action: {
          label: 'Validate Vendor',
          onClick: () => console.log('Validate vendor')
        }
      })
      
      issues.vendor = vendorIssues
    }

    // Date validation
    if (invoice.date) {
      const invoiceDate = new Date(invoice.date)
      const expectedDate = new Date(mockPOData.expectedDate)
      const daysDiff = Math.abs((invoiceDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      const dateIssues: ValidationIssue[] = []
      if (daysDiff > 30) {
        dateIssues.push({
          type: 'warning',
          message: `Invoice date is ${Math.round(daysDiff)} days from expected PO date`,
          action: {
            label: 'Copy PO Date',
            onClick: () => console.log('Copy PO date')
          }
        })
      }
      if (invoiceDate > new Date()) {
        dateIssues.push({
          type: 'error',
          message: 'Invoice date is in the future'
        })
      }
      if (dateIssues.length > 0) issues.date = dateIssues
    }

    // Amount validation
    if (invoice.amount && invoice.amount > mockPOData.maxAmount) {
      issues.amount = [{
        type: 'error',
        message: `Amount exceeds PO limit by ${formatCurrency(invoice.amount - mockPOData.maxAmount, invoice.currency_code)}`
      }]
    }

    // Currency validation
    if (invoice.currency_code && invoice.currency_code !== mockPOData.currency) {
      issues.currency = [{
        type: 'warning',
        message: `Currency mismatch: PO expects ${mockPOData.currency}`,
        action: {
          label: 'Use PO Currency',
          onClick: () => console.log('Copy PO currency')
        }
      }]
    }

    // Due date validation
    if (invoice.due_date) {
      const dueDate = new Date(invoice.due_date)
      const today = new Date()
      if (dueDate < today) {
        issues.dueDate = [{
          type: 'error',
          message: 'Due date has already passed'
        }]
      }
    }

    setValidationIssues(issues)
  }, [invoice, linkedPO])

  // Helper function to get the most severe issue type for a field
  const getMostSevereIssueType = (fieldIssues: ValidationIssue[]): 'error' | 'warning' | 'info' => {
    if (fieldIssues.some(issue => issue.type === 'error')) return 'error'
    if (fieldIssues.some(issue => issue.type === 'warning')) return 'warning'
    return 'info'
  }

  // Helper function to get field display name
  const getFieldDisplayName = (fieldKey: string): string => {
    const fieldNames: {[key: string]: string} = {
      invoiceNumber: 'Invoice Number',
      vendor: 'Vendor',
      date: 'Invoice Date',
      dueDate: 'Due Date',
      amount: 'Total Amount',
      currency: 'Currency'
    }
    return fieldNames[fieldKey] || fieldKey
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
    const fieldIssues = validationIssues[fieldKey]
    
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
              {fieldIssues.length === 1 ? 'Validation Issue' : `${fieldIssues.length} Validation Issues`}
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

  // Handle field value changes
  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // Handle field blur
  const handleFieldBlur = (fieldName: string, e?: React.FocusEvent) => {
    // Check if we're clicking on another editable field
    const relatedTarget = e?.relatedTarget as HTMLElement
    if (relatedTarget?.closest('[data-editable-field]')) {
      // Don't set to null, let the click handler of the new field handle it
      return
    }
    
    setEditingField(null)
    // Here you would typically save the value
    if (fieldName === 'invoiceNumber' && fieldValues.invoiceNumber) {
      setInvoice(prev => prev ? { ...prev, number: fieldValues.invoiceNumber } : prev)
    }
    // Add other field mappings as needed
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
    const hasValidationIssues = validationIssues[fieldName]
    const hasError = hasValidationIssues?.some(i => i.type === 'error')
    const hasWarning = hasValidationIssues?.some(i => i.type === 'warning')
    
    const handleFieldClick = (e: React.MouseEvent) => {
      // Prevent editing when clicking on validation indicator
      const target = e.target as HTMLElement
      if (target.closest('[data-validation-indicator]')) {
        e.stopPropagation()
        return
      }
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
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full max-w-full">
                                  <span className="truncate max-w-[160px]">
                                    {value}
                                  </span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{value}</p>
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
                        open={true}
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
                  open={true}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full h-[40px] text-sm",
                      hasError ? "border-red-300 bg-red-50 focus:ring-0" : 
                      hasWarning ? "border-amber-300 bg-amber-50 focus:ring-0" : 
                      "border-violet-500 bg-white focus:ring-0"
                    )}
                    onBlur={(e) => handleFieldBlur(fieldName, e)}
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
                  open={true}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full h-[40px] text-sm",
                      hasError ? "border-red-300 bg-red-50 focus:ring-0" : 
                      hasWarning ? "border-amber-300 bg-amber-50 focus:ring-0" : 
                      "border-violet-500 bg-white focus:ring-0"
                    )}
                    onBlur={(e) => handleFieldBlur(fieldName, e)}
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
                <Popover open={true}>
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
                      onBlur={(e) => handleFieldBlur(fieldName, e)}
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
              <div data-validation-indicator className="absolute right-3 top-1/2 -translate-y-1/2">
                {renderValidationIndicator(fieldName)}
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full max-w-full">
                            <span className="truncate max-w-[160px]">
                              {value}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{value}</p>
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
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-6 justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="outline" size="sm" className="mr-4 px-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">Invoice {invoice?.number || 'new'}</h1>
              <Badge className="ml-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-700">
                Pending Approval
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="text-gray-700">
                  Cancel
                </Button>
              </Link>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">Save</Button>
            </div>
          </div>
        </header>

        <div className="bg-gray-50/50 border-b">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
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
              <div className="h-8 w-px bg-gray-200" />

              {/* PO Available Balance */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 tracking-wider">PO Total</p>
                  <p className="text-sm font-semibold text-gray-900 -mt-0.5">
                    {invoice?.po_number ? formatCurrency(invoice.amount * 1.2, invoice.currency_code) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Separator */}
              <div className="h-8 w-px bg-gray-200" />

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
                  <div className="h-8 w-px bg-gray-200" />

                  {/* Variance */}
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-violet-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 tracking-wider">Variance</p>
                      <div className="flex items-center gap-2 -mt-0.5">
                        <p className="text-sm font-semibold text-amber-600">
                          +{formatCurrency(invoice.amount * 0.2, invoice.currency_code)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* No PO Status - only show if no PO */}
              {!invoice?.po_number && (
                <>
                  <div className="h-8 w-px bg-gray-200" />
                  
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

            {/* Approval Status - Right Side */}
            <div className="flex items-center">
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF Preview - Independent */}
            <div className="border rounded-lg overflow-hidden">
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
                            <div className="flex-1 bg-gray-50 overflow-auto">
                              {renderFilePreview(true)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogPortal>
                  </Dialog>
                </div>
              </div>

              <div className="flex items-center justify-center p-2 h-[650px] bg-gray-50 overflow-auto" ref={pdfContainerRef}>
                {renderFilePreview()}
              </div>
            </div>

            {/* Tabbed Content - Controls right side only */}
            <div className="flex flex-col mt-px">
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
                                Mismatches ({getIssueCounts().total})
                              </button>
                            </SheetTrigger>
                            <SheetContent className="w-[700px] sm:w-[900px] flex flex-col">
                              <SheetHeader className="flex-shrink-0 pb-3">
                                <SheetTitle>Mismatches</SheetTitle>
                          </SheetHeader>
                          
                          <div className="flex-1 overflow-y-auto mt-3">
                            {/* Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-gray-900">Summary</h3>
                                <div className="flex items-center gap-4 text-sm">
                                  {getIssueCounts().errors > 0 && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <AlertCircle className="h-4 w-4" />
                                      {getIssueCounts().errors} error{getIssueCounts().errors > 1 ? 's' : ''}
                                    </div>
                                  )}
                                  {getIssueCounts().warnings > 0 && (
                                    <div className="flex items-center gap-1 text-amber-600">
                                      <AlertTriangle className="h-4 w-4" />
                                      {getIssueCounts().warnings} warning{getIssueCounts().warnings > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">
                                Review and resolve invoice mismatches.
                              </p>
                            </div>

                            {/* Issues by Field */}
                            <div className="space-y-6">
                              {Object.entries(validationIssues).map(([fieldKey, fieldIssues]) => {
                                // Filter out resolved issues
                                const activeIssues = fieldIssues.filter((_, index) => {
                                  const issueId = `${fieldKey}-${index}`
                                  return !resolvedIssues.has(issueId)
                                })
                                
                                // Don't render section if no active issues
                                if (activeIssues.length === 0) return null
                                
                                return (
                                  <div key={fieldKey} className="mb-6">
                                    <div className="mb-3">
                                      <h4 className="font-semibold text-gray-900 text-base">{getFieldDisplayName(fieldKey)}</h4>
                                    </div>
                                  
                                    <div className="space-y-4">
                                      {fieldIssues.map((issue, index) => {
                                        const issueId = `${fieldKey}-${index}`
                                        const isResolving = resolvingIssues.has(issueId)
                                        const isResolved = resolvedIssues.has(issueId)
                                        
                                        return (
                                          <div 
                                            key={index} 
                                            className={`relative bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-500 ${
                                              isResolved ? 'transform translate-x-full opacity-0 pointer-events-none' :
                                              isResolving ? 'border-green-200' : 'hover:shadow-md'
                                            }`}
                                            style={{
                                              height: isResolved ? '0' : 'auto',
                                              marginBottom: isResolved ? '0' : undefined,
                                              overflow: isResolved ? 'hidden' : 'visible'
                                            }}
                                          >
                                            <div className="flex items-start gap-4">
                                              <div className="flex-shrink-0 mt-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                  isResolving ? 'bg-green-100' : 
                                                  issue.type === 'error' ? 'bg-red-100' : 
                                                  issue.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
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
                                                <p className="text-sm font-medium text-gray-900 mb-2 leading-relaxed">{issue.message}</p>
                                                {issue.action && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={`h-8 text-xs font-medium px-4 transition-all duration-300 ${
                                                      isResolving 
                                                        ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-100' 
                                                        : 'hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
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
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Resolved
                                                      </>
                                                    ) : (
                                                      issue.action.label
                                                    )}
                                                  </Button>
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
                        </SheetContent>
                      </Sheet>
                    )}
                  </div>

                      <div className="space-y-4">
                        {/* Row 1: Invoice Number + Vendor */}
                        <div className="grid grid-cols-2 gap-6">
                          <EditableField
                            fieldName="invoiceNumber"
                            label="Invoice Number"
                            value={invoice?.number}
                          />
                          <EditableField
                            fieldName="vendor"
                            label="Vendor"
                            value={invoice?.vendor}
                          />
                        </div>

                        {/* Row 2: GL Account + Invoice Date */}
                        <div className="grid grid-cols-2 gap-6">
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
                            fieldName="date"
                            label="Invoice Date"
                            value={invoice?.date || ''}
                            type="date"
                          />
                        </div>

                        {/* Row 3: Due Date + Tax Amount */}
                        <div className="grid grid-cols-2 gap-6">
                          <EditableField
                            fieldName="dueDate"
                            label="Due Date"
                            value={invoice?.due_date || ''}
                            type="date"
                          />
                          <EditableField
                            fieldName="taxAmount"
                            label="Tax Amount"
                            value={invoice?.tax_amount?.toString() || ''}
                            type="number"
                          />
                        </div>

                        {/* Row 4: Total Amount + Payment Terms */}
                        <div className="grid grid-cols-2 gap-6">
                          <EditableField
                            fieldName="amount"
                            label="Total Amount"
                            value={invoice?.amount?.toString() || ''}
                            type="number"
                          />
                          <EditableField
                            fieldName="paymentTerms"
                            label="Payment Terms"
                            value={invoice?.payment_term_days ? `Net ${invoice.payment_term_days}` : 'Net 30'}
                            type="select"
                            options={[
                              { value: "Net 15", label: "Net 15" },
                              { value: "Net 30", label: "Net 30" },
                              { value: "Net 45", label: "Net 45" },
                              { value: "Net 60", label: "Net 60" },
                              { value: "Due on Receipt", label: "Due on Receipt" }
                            ]}
                          />
                        </div>

                        {/* Row 5: Currency + Invoice Description */}
                        <div className="grid grid-cols-2 gap-6">
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
                          <EditableField
                            fieldName="invoiceDescription"
                            label="Invoice Description"
                            value="Professional services - Q4 consulting"
                          />
                        </div>

                        <div>
                          <div className="mb-3">
                            <label className="text-sm font-medium">Linked Documents</label>
                          </div>
                          
                          {/* Purchase Orders Section */}
                          <div className="mb-2">
                            <div className="w-full">
                              {linkedPO ? (
                                <div className="border border-gray-200 rounded-lg p-2.5 bg-white h-12 flex items-center w-full animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between w-full min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                      <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded text-xs font-medium text-violet-600 flex-shrink-0">
                                        PO
                                      </div>
                                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                        <span className="text-violet-600 font-medium text-sm flex-shrink-0">{linkedPO}</span>
                                        <span className="text-sm text-gray-500 flex-shrink-0 hidden sm:inline">4 of 4 items matched</span>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                                          Matched
                                        </span>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2 transition-all duration-200 hover:scale-110" onClick={handleRemovePO}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="border border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all duration-300 h-12 flex items-center justify-center w-full animate-in fade-in-0 slide-in-from-bottom-2 group hover:shadow-sm"
                                  onClick={handleAddPO}
                                >
                                  <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-violet-600 transition-colors duration-200">
                                    <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                                    <span className="text-sm font-medium">Add PO</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Goods Receipt Notes Section */}
                          <div>
                            <div className="w-full">
                              {linkedGR ? (
                                <div className="border border-gray-200 rounded-lg p-2.5 bg-white h-12 flex items-center w-full animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between w-full min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                      <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded text-xs font-medium text-violet-600 flex-shrink-0">
                                        GR
                                      </div>
                                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                        <span className="text-violet-600 font-medium text-sm flex-shrink-0">{linkedGR}</span>
                                        <span className="text-sm text-gray-500 flex-shrink-0 hidden sm:inline">4 of 4 items received</span>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                                          Received
                                        </span>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2 transition-all duration-200 hover:scale-110" onClick={handleRemoveGR}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="border border-dashed border-gray-300 rounded-lg p-2.5 bg-gray-50 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all duration-300 h-12 flex items-center justify-center w-full animate-in fade-in-0 slide-in-from-bottom-2 group hover:shadow-sm"
                                  onClick={handleAddGR}
                                >
                                  <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-violet-600 transition-colors duration-200">
                                    <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                                    <span className="text-sm font-medium">Add GR</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 p-0 mt-4">
                  <div className="border rounded-lg overflow-hidden h-full">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Activity Log</h2>
                        <div></div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Invoice created</p>
                            <p className="text-sm text-muted-foreground">Created from uploaded file with extracted data</p>
                            <p className="text-xs text-muted-foreground mt-1">Just now</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="flex-1 p-0 mt-4">
                  <div className="border rounded-lg overflow-hidden h-full">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Attachments</h2>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Plus className="h-4 w-4" />
                          Add Attachment
                        </Button>
                      </div>

                      {fileName ? (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-violet-600" />
                              <div>
                                <p className="font-medium">{fileName}</p>
                                <p className="text-xs text-muted-foreground">Uploaded just now</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleDownload}>
                              Download
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-8 text-center">
                          <p className="text-muted-foreground">No attachments yet.</p>
                        </div>
                      )}
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
                    {getLineItemStats().mismatched > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-full">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <span className="text-gray-700 text-xs">{getLineItemStats().mismatched} mismatched</span>
                      </div>
                    )}
                    {getLineItemStats().missing > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-full">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700 text-xs">{getLineItemStats().missing} missing</span>
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
                  <div className="flex-shrink-0 bg-white z-10 shadow-lg">
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
                                  {status === 'matched' ? 'Matched' : status === 'mismatch' ? 'Mismatch' : 'Missing'}
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
                  <div className="flex-1 overflow-x-auto bg-white shadow-lg">
                    <Table className={cn(
                      "min-w-[200px]",
                      linkedPO && linkedGR && "min-w-[840px]",
                      linkedPO && !linkedGR && "min-w-[516px]",
                      !linkedPO && linkedGR && "min-w-[404px]",
                      !linkedPO && !linkedGR && "w-full"
                    )}>
                      <TableHeader>
                        <TableRow className="bg-gray-50 h-auto">
                          {linkedPO && (
                            <>
                              <TableHead className="min-w-[80px] text-sm font-medium py-2 px-2">PO Line<br/>Source</TableHead>
                              <TableHead className="min-w-[224px] text-sm font-medium py-2 px-2">PO Description</TableHead>
                              <TableHead className="min-w-[48px] text-right text-sm font-medium py-2 px-2">PO<br/>Qty</TableHead>
                              <TableHead className="min-w-[80px] text-right text-sm font-medium py-2 px-2">PO Unit<br/>Price</TableHead>
                              <TableHead className={cn(
                                "min-w-[80px] text-right text-sm font-medium py-2 px-2",
                                !linkedGR && "border-r-2 border-violet-300"
                              )}>PO<br/>Total</TableHead>
                            </>
                          )}
                          {linkedGR && (
                            <>
                              <TableHead className={cn(
                                "min-w-[80px] text-sm font-medium py-2 px-2",
                                linkedPO && "border-l-2 border-violet-300"
                              )}>GR Line<br/>Source</TableHead>
                              <TableHead className="min-w-[224px] text-sm font-medium py-2 px-2">GR Description</TableHead>
                              <TableHead className="min-w-[48px] text-right text-sm font-medium py-2 px-2 border-r-2 border-violet-300">GR<br/>Qty</TableHead>
                            </>
                          )}
                          <TableHead className={cn(
                            "text-center text-sm font-medium py-2 px-2",
                            !linkedPO && !linkedGR ? "w-1/2" : "min-w-[48px]"
                          )}>Comments</TableHead>
                          <TableHead className={cn(
                            "text-center text-sm font-medium py-2 px-2",
                            !linkedPO && !linkedGR ? "w-1/2" : "min-w-[48px]"
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
                                  <TableCell className="h-[50px] py-1 px-2 align-middle">
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
                  <p className="text-sm mb-4">Click "Add Item" to add line items to this invoice.</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddLineItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
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
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              )}
            </div>
            
            {/* PO Lines Not Found Section */}
            {mockPOLines.length > 0 && (
              <div className="border-t">
                <div className="p-3">
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none">
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                      <span className="text-sm font-medium text-gray-900">PO Lines Not Found on Invoice</span>
                      <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0.5">
                        {mockPOLines.length - Object.values(lineItemMatches).filter(m => m.poLineId).length}
                      </Badge>
                    </summary>
                    <div className="mt-2 pl-4">
                      <div className="text-xs text-gray-600 mb-1">
                        PO-2023-001: {mockPOLines.length - Object.values(lineItemMatches).filter(m => m.poLineId).length} items
                      </div>
                      <div className="space-y-1">
                        {mockPOLines
                          .filter(poLine => !Object.values(lineItemMatches).some(m => m.poLineId === poLine.id))
                          .map((poLine) => (
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
