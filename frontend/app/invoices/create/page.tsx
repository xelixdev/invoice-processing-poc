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
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface InvoiceData {
  document_type: string;
  invoices: Invoice[];
  extraction_confirmed: boolean;
}

interface Invoice {
  invoice_number: string;
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
  const [isDocumentDrawerOpen, setIsDocumentDrawerOpen] = useState(false)
  const [documentDrawerType, setDocumentDrawerType] = useState<'po' | 'gr' | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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
      
      // Check if extraction has been confirmed - if not, redirect to review
      if (!parsedData.extraction_confirmed) {
        router.push("/invoices/extraction-review")
        return
      }
      
      setExtractedData(parsedData)
      
      // Set the first invoice as the current one
      if (parsedData.invoices && parsedData.invoices.length > 0) {
        setInvoice(parsedData.invoices[0])
        // Initialize linked PO state
        setLinkedPO(parsedData.invoices[0].po_number)
        // Initialize with a sample GR for demonstration
        setLinkedGR("GR-2023-001")
      }
    } else {
      // If no extracted data, redirect to upload
      router.push("/invoices/upload")
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
  }, [router])

  // Validation logic
  useEffect(() => {
    if (!invoice || !linkedPO) {
      setValidationIssues({})
      return
    }

    const issues: {[key: string]: ValidationIssue[]} = {}

    // Invoice Number validation
    const invoiceIssues: ValidationIssue[] = []
    if (invoice.invoice_number !== mockPOData.invoiceNumber) {
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
    if (invoiceIssues.length > 0) issues.invoice_number = invoiceIssues

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
      invoice_number: 'Invoice Number',
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

  // Handle opening document drawer for PO
  const handleViewPODocument = () => {
    setDocumentDrawerType('po')
    setIsDocumentDrawerOpen(true)
  }

  // Handle opening document drawer for GR
  const handleViewGRDocuments = () => {
    setDocumentDrawerType('gr')
    setIsDocumentDrawerOpen(true)
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
              <h1 className="text-lg font-semibold">Invoice {invoice?.invoice_number || 'new'}</h1>
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
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* 2-Way Match Results - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  2-Way Match: Invoice ↔ Purchase Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Match Status */}
                  <div className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-800">Match Status</span>
                      <Badge className="bg-green-100 text-green-800">✓ Matched</Badge>
                    </div>
                    <p className="text-sm text-green-700">Invoice matched to PO {invoice?.po_number}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-green-100 p-2 rounded">
                        <div className="text-green-800 font-medium">4/4 Fields</div>
                        <div className="text-green-600">Matched</div>
                      </div>
                      <div className="bg-amber-100 p-2 rounded">
                        <div className="text-amber-800 font-medium">1 Warning</div>
                        <div className="text-amber-600">Date variance</div>
                      </div>
                    </div>
                  </div>

                  {/* Document Comparison */}
                  <div className="lg:col-span-2 border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Document Comparison</span>
                        <div className="flex bg-white rounded-md p-1 border">
                          <button 
                            className="px-3 py-1.5 text-sm rounded bg-violet-100 text-violet-700 font-medium"
                          >
                            Invoice
                          </button>
                          <button 
                            className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
                          >
                            PO {invoice?.po_number}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {/* Comparison Table */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                          <span>Field</span>
                          <span>Invoice</span>
                          <span>Purchase Order</span>
                        </div>
                        
                        {/* Vendor Comparison */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Vendor</span>
                          <span className="font-medium">{invoice?.vendor}</span>
                          <span className="font-medium text-green-600">✓ {invoice?.vendor}</span>
                        </div>
                        
                        {/* Amount Comparison */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Amount</span>
                          <span className="font-medium">{formatCurrency(invoice?.amount, invoice?.currency_code)}</span>
                          <span className="font-medium text-green-600">✓ {formatCurrency(invoice?.amount, invoice?.currency_code)}</span>
                        </div>
                        
                        {/* Currency Comparison */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Currency</span>
                          <span className="font-medium">{invoice?.currency_code}</span>
                          <span className="font-medium text-green-600">✓ {invoice?.currency_code}</span>
                        </div>
                        
                        {/* Date Comparison */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Date</span>
                          <span className="font-medium">{formatDate(invoice?.date)}</span>
                          <span className="font-medium text-amber-600">⚠ {formatDate("2025-01-08")}</span>
                        </div>
                      </div>
                      
                      {/* View Document Button */}
                      <div className="mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm" className="w-full" onClick={handleViewPODocument}>
                          <FileText className="h-4 w-4 mr-2" />
                          View PO Document
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3-Way Match Results - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  3-Way Match: Invoice ↔ PO ↔ Goods Receipt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Match Status */}
                  <div className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-800">Match Status</span>
                      <Badge className="bg-green-100 text-green-800">✓ Matched</Badge>
                    </div>
                    <p className="text-sm text-green-700">All items received and confirmed</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-green-100 p-2 rounded">
                        <div className="text-green-800 font-medium">2 GR Notes</div>
                        <div className="text-green-600">All received</div>
                      </div>
                      <div className="bg-green-100 p-2 rounded">
                        <div className="text-green-800 font-medium">100%</div>
                        <div className="text-green-600">Quality OK</div>
                      </div>
                    </div>
                  </div>

                  {/* Document Comparison */}
                  <div className="lg:col-span-2 border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Document Comparison</span>
                        <div className="flex bg-white rounded-md p-1 border">
                          <button 
                            className="px-3 py-1.5 text-sm rounded bg-violet-100 text-violet-700 font-medium"
                          >
                            Invoice
                          </button>
                          <button 
                            className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
                          >
                            GR-001
                          </button>
                          <button 
                            className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
                          >
                            GR-002
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {/* Comparison Table */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                          <span>Field</span>
                          <span>Invoice</span>
                          <span>Goods Receipt</span>
                        </div>
                        
                        {/* Total Quantity Comparison */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Total Qty</span>
                          <span className="font-medium">4 items</span>
                          <span className="font-medium text-green-600">✓ 4 items</span>
                        </div>
                        
                        {/* Delivery Date Comparison */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Delivery</span>
                          <span className="font-medium">{formatDate(invoice?.date)}</span>
                          <span className="font-medium text-green-600">✓ {formatDate("2025-01-09")}</span>
                        </div>
                        
                        {/* Quality Status */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Quality</span>
                          <span className="font-medium">As ordered</span>
                          <span className="font-medium text-green-600">✓ Accepted</span>
                        </div>
                        
                        {/* Receiving Location */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Location</span>
                          <span className="font-medium">Warehouse A</span>
                          <span className="font-medium text-green-600">✓ Warehouse A</span>
                        </div>
                      </div>
                      
                      {/* View Document Button */}
                      <div className="mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm" className="w-full" onClick={handleViewGRDocuments}>
                          <FileText className="h-4 w-4 mr-2" />
                          View GR Documents
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Xelix Checks - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-violet-600" />
                  </div>
                  Xelix Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Check Status */}
                  <div className="border rounded-lg p-4 bg-gradient-to-b from-violet-50 to-purple-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-violet-800">Check Status</span>
                      <Badge className="bg-amber-100 text-amber-800">⚠ Issues Found</Badge>
                    </div>
                    <p className="text-sm text-violet-700 mb-3">4 checks completed with mixed results</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-green-100 p-2 rounded">
                        <div className="text-green-800 font-medium">2 Passed</div>
                        <div className="text-green-600">No issues</div>
                      </div>
                      <div className="bg-amber-100 p-2 rounded">
                        <div className="text-amber-800 font-medium">1 Warning</div>
                        <div className="text-amber-600">Review needed</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="bg-red-100 p-2 rounded">
                        <div className="text-red-800 font-medium text-xs">1 Issue</div>
                        <div className="text-red-600 text-xs">Action required</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-violet-200">
                      <div className="text-sm">
                        <span className="text-violet-700">Risk Score:</span>
                        <span className="font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 ml-2">Medium</span>
                      </div>
                    </div>
                  </div>

                  {/* Check Details */}
                  <div className="lg:col-span-2 border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Check Details</span>
                        <div className="flex bg-white rounded-md p-1 border">
                          <button 
                            className="px-3 py-1.5 text-sm rounded bg-violet-100 text-violet-700 font-medium"
                          >
                            Duplicate
                          </button>
                          <button 
                            className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
                          >
                            Amount
                          </button>
                          <button 
                            className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
                          >
                            Tax
                          </button>
                          <button 
                            className="px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100"
                          >
                            Invoice #
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {/* Check Results Table */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                          <span>Check Type</span>
                          <span>Result</span>
                          <span>Details</span>
                        </div>
                        
                        {/* Duplicate Detection */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Duplicate Detection</span>
                          <span className="font-medium text-green-600">✓ Clear</span>
                          <span className="text-gray-600">No duplicates in 12,847 invoices</span>
                        </div>
                        
                        {/* Amount Analysis */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Amount Analysis</span>
                          <span className="font-medium text-amber-600">⚠ Unusual</span>
                          <span className="text-gray-600">Higher than vendor average ({formatCurrency(1850, invoice?.currency_code)})</span>
                        </div>
                        
                        {/* Tax Validation */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Tax Validation</span>
                          <span className="font-medium text-red-600">✗ Issue</span>
                          <span className="text-gray-600">Expected 20% VAT, found 0%</span>
                        </div>
                        
                        {/* Invoice Number */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="text-gray-600 font-medium">Invoice Number</span>
                          <span className="font-medium text-green-600">✓ Normal</span>
                          <span className="text-gray-600">Pattern matches vendor history</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 border-violet-200 text-violet-700 hover:bg-violet-50">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            View Tax Issue
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 border-violet-200 text-violet-700 hover:bg-violet-50">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            View Amount Analysis
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details & Line Items - Combined */}
            <div className="space-y-6">
              {/* Invoice Information with Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Invoice Details</span>
                    <div className="flex items-center gap-2">
                      {getIssueCounts().total > 0 && (
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
                      )}
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Invoice Header Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Row 1: Basic Information */}
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Invoice Number</label>
                        {renderValidationIndicator('invoice_number')}
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{invoice?.invoice_number || "Not specified"}</div>
                    </div>
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

                    {/* Row 2: Dates */}
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
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Payment Terms</label>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50 text-sm">
                        {invoice?.payment_term_days ? `Net ${invoice.payment_term_days}` : "Not specified"}
                      </div>
                    </div>

                    {/* Row 3: Financial Information */}
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Currency</label>
                        {renderValidationIndicator('currency')}
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50 text-sm">{invoice?.currency_code || "USD"}</div>
                    </div>
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

                  {/* Line Items Section */}
                  <div className="pt-6 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Line Items ({invoice?.line_items?.length || 0})</h3>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    </div>

                    {invoice?.line_items && invoice.line_items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[45%]">Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.line_items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-sm">{item.description}</TableCell>
                              <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(item.unit_price, invoice.currency_code)}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(item.total, invoice.currency_code)}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <List className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No line items found</p>
                        <p className="text-xs text-gray-400 mt-1">Click "Add Item" to add line items</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions - Final Section */}
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve for Payment
                  </Button>
                  <Button variant="outline" className="w-full">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Request Additional Review
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Invoice
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Document Comparison Drawer */}
      <Sheet open={isDocumentDrawerOpen} onOpenChange={setIsDocumentDrawerOpen}>
        <SheetContent 
          className="max-w-none flex flex-col p-0 !w-[95vw] !max-w-[95vw]"
          data-drawer="document-comparison"
        >
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Comparison - {documentDrawerType === 'po' ? 'Purchase Order' : 'Goods Receipt'}
            </SheetTitle>
            <SheetDescription>
              Compare the uploaded invoice with {documentDrawerType === 'po' ? 'purchase order' : 'goods receipt'} documents
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side - Original Invoice */}
            <div className="w-1/2 border-r bg-gray-50 flex flex-col">
              <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Original Invoice</h3>
                <Badge variant="secondary" className="text-xs">
                  {fileName || 'invoice.pdf'}
                </Badge>
              </div>
              <div className="flex-1 p-4">
                <div className="w-full h-full bg-white rounded-lg border overflow-hidden">
                  {renderFilePreview(false)}
                </div>
              </div>
            </div>

            {/* Right Side - Comparison Documents */}
            <div className="w-1/2 bg-gray-50 flex flex-col">
              {documentDrawerType === 'po' ? (
                <>
                  <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Purchase Order</h3>
                    <Badge variant="secondary" className="text-xs">
                      {linkedPO || 'PO-2023-001'}.pdf
                    </Badge>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="w-full h-full bg-white rounded-lg border overflow-hidden">
                      {/* Mock PO Document */}
                      <div className="w-full h-full flex items-center justify-center text-center p-8">
                        <div>
                          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-600 mb-2">Purchase Order {linkedPO || 'PO-2023-001'}</p>
                          <p className="text-sm text-gray-500 mb-4">
                            Vendor: {invoice?.vendor}<br/>
                            Amount: {formatCurrency(invoice?.amount, invoice?.currency_code)}<br/>
                            Date: {formatDate("2025-01-08")}
                          </p>
                          <Button variant="outline" size="sm">
                            Download PO PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 py-3 border-b bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Goods Receipt Documents</h3>
                      <Badge variant="secondary" className="text-xs">
                        2 Documents
                      </Badge>
                    </div>
                    <Tabs defaultValue="gr1" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-8">
                        <TabsTrigger value="gr1" className="text-xs">GR-001</TabsTrigger>
                        <TabsTrigger value="gr2" className="text-xs">GR-002</TabsTrigger>
                      </TabsList>
                      <TabsContent value="gr1" className="mt-4">
                        <div className="h-[calc(100vh-240px)]">
                          <div className="w-full h-full bg-white rounded-lg border overflow-hidden">
                            {/* Mock GR Document 1 */}
                            <div className="w-full h-full flex items-center justify-center text-center p-8">
                              <div>
                                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-600 mb-2">Goods Receipt GR-001</p>
                                <p className="text-sm text-gray-500 mb-4">
                                  Received: 2 items<br/>
                                  Date: {formatDate("2025-01-09")}<br/>
                                  Location: Warehouse A<br/>
                                  Status: Accepted
                                </p>
                                <Button variant="outline" size="sm">
                                  Download GR PDF
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="gr2" className="mt-4">
                        <div className="h-[calc(100vh-240px)]">
                          <div className="w-full h-full bg-white rounded-lg border overflow-hidden">
                            {/* Mock GR Document 2 */}
                            <div className="w-full h-full flex items-center justify-center text-center p-8">
                              <div>
                                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-600 mb-2">Goods Receipt GR-002</p>
                                <p className="text-sm text-gray-500 mb-4">
                                  Received: 2 items<br/>
                                  Date: {formatDate("2025-01-10")}<br/>
                                  Location: Warehouse A<br/>
                                  Status: Accepted
                                </p>
                                <Button variant="outline" size="sm">
                                  Download GR PDF
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Compare documents side by side</span>
              <Button variant="outline" size="sm">
                <Maximize className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsDocumentDrawerOpen(false)}>
                Close
              </Button>
              <Button className="bg-violet-600 hover:bg-violet-700">
                Confirm Match
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
