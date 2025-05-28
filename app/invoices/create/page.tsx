"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, FileText, Edit, Plus, Download, ChevronLeft, ChevronRight, Maximize, X, Receipt, FileCheck, TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Calendar, Copy, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Sidebar from "@/components/sidebar"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  // Mock PO data for validation
  const mockPOData = {
    vendor: "Globex Corporation",
    expectedDate: "2024-01-15",
    maxAmount: 2500.00,
    currency: "USD",
    invoiceNumber: "INV-002"
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
    if (!fieldIssues || fieldIssues.length === 0) return null

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
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-gray-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
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
                  
                  {/* Issues pill at the end of tabs */}
                  {getIssueCounts().total > 0 && (
                    <div className="flex items-center h-12">
                      <Sheet open={isIssuesDrawerOpen} onOpenChange={setIsIssuesDrawerOpen}>
                        <SheetTrigger asChild>
                          <button className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-full hover:bg-red-200 transition-colors flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3" />
                            Issues ({getIssueCounts().total})
                          </button>
                        </SheetTrigger>
                        <SheetContent className="w-[480px] sm:w-[600px] flex flex-col">
                          <SheetHeader className="flex-shrink-0">
                            <SheetTitle>Validation Issues</SheetTitle>
                          </SheetHeader>
                          
                          <div className="flex-1 overflow-y-auto mt-6">
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
                                Review and resolve invoice validation issues.
                              </p>
                            </div>

                            {/* Issues by Field */}
                            <div className="space-y-6">
                              {Object.entries(validationIssues).map(([fieldKey, fieldIssues]) => (
                                <div key={fieldKey} className="border rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <h4 className="font-medium text-gray-900">{getFieldDisplayName(fieldKey)}</h4>
                                    <Badge variant="secondary" className="text-xs">
                                      {fieldIssues.length} issue{fieldIssues.length > 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {fieldIssues.map((issue, index) => (
                                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
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
                                              onClick={() => {
                                                issue.action?.onClick()
                                                setIsIssuesDrawerOpen(false)
                                              }}
                                            >
                                              {issue.action.label}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
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
                    </div>
                  )}
                </div>

                <TabsContent value="details" className="flex-1 p-0 mt-4">
                  <div className="border rounded-lg overflow-hidden h-full">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Invoice Details</h2>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {/* Row 1: Invoice Number + Invoice Description */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Invoice Number</label>
                              {renderValidationIndicator('invoiceNumber')}
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{invoice?.number || "Not specified"}</div>
                          </div>
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Invoice Description</label>
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">Professional services - Q4 consulting</div>
                          </div>
                        </div>

                        {/* Row 2: Vendor + GL Account/Cost Center */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Vendor</label>
                              {renderValidationIndicator('vendor')}
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{invoice?.vendor || "Not specified"}</div>
                          </div>
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">GL Account / Cost Center</label>
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">6200-001 - Professional Services</div>
                          </div>
                        </div>

                        {/* Row 3: Invoice Date + Due Date */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Invoice Date</label>
                              {renderValidationIndicator('date')}
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{formatDate(invoice?.date)}</div>
                          </div>
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Due Date</label>
                              {renderValidationIndicator('dueDate')}
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{formatDate(invoice?.due_date)}</div>
                          </div>
                        </div>

                        {/* Row 4: Tax Amount + Total Amount */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Tax Amount</label>
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">
                              {invoice?.tax_amount !== undefined ? formatCurrency(invoice.tax_amount, invoice.currency_code) : "Not specified"}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Total Amount</label>
                              {renderValidationIndicator('amount')}
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">
                              {invoice?.amount !== undefined ? formatCurrency(invoice.amount, invoice.currency_code) : "Not specified"}
                            </div>
                          </div>
                        </div>

                        {/* Row 5: Payment Terms + Currency */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Payment Terms</label>
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">
                              {invoice?.payment_term_days ? `Net ${invoice.payment_term_days}` : "Not specified"}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center mb-2">
                              <label className="text-sm font-medium">Currency</label>
                              {renderValidationIndicator('currency')}
                            </div>
                            <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{invoice?.currency_code || "USD"}</div>
                          </div>
                        </div>

                        <div>
                          <div className="mb-3">
                            <label className="text-sm font-medium">Linked Documents</label>
                          </div>
                          
                          {/* Purchase Orders Section */}
                          <div className="mb-2">
                            <div className="w-full">
                              {linkedPO ? (
                                <div className="border-2 border-solid border-gray-200 rounded-lg p-3 bg-white h-14 flex items-center w-full animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between w-full min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                      <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded text-xs font-medium text-violet-600 flex-shrink-0">
                                        PO
                                      </div>
                                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                        <span className="text-violet-600 font-medium flex-shrink-0">{linkedPO}</span>
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
                                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all duration-300 h-14 flex items-center justify-center w-full animate-in fade-in-0 slide-in-from-bottom-2 group hover:shadow-sm"
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
                                <div className="border-2 border-solid border-gray-200 rounded-lg p-3 bg-white h-14 flex items-center w-full animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between w-full min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                      <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded text-xs font-medium text-violet-600 flex-shrink-0">
                                        GR
                                      </div>
                                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                        <span className="text-violet-600 font-medium flex-shrink-0">{linkedGR}</span>
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
                                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all duration-300 h-14 flex items-center justify-center w-full animate-in fade-in-0 slide-in-from-bottom-2 group hover:shadow-sm"
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
            <div className="flex items-center justify-between p-3 border-b h-12">
              <h3 className="font-medium">Line Items</h3>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="overflow-hidden">
              {invoice?.line_items && invoice.line_items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.line_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price, invoice.currency_code)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total, invoice.currency_code)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No line items found. Click "Add Item" to add line items to this invoice.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
