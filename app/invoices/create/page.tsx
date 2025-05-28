"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Search, Maximize, FileText, Circle, Edit, Plus, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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

export default function InvoiceDetailsPage() {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Retrieve the extracted data from sessionStorage
    const storedData = sessionStorage.getItem("extractedInvoiceData")
    if (storedData) {
      const parsedData = JSON.parse(storedData) as InvoiceData
      setExtractedData(parsedData)
      
      // Set the first invoice as the current one
      if (parsedData.invoices && parsedData.invoices.length > 0) {
        setInvoice(parsedData.invoices[0])
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="border-b sticky top-0 bg-background z-10">
          <div className="flex h-16 items-center px-4 justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="outline" size="icon" className="mr-4">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-semibold">Invoice {invoice?.number || 'new'}</h1>
              <Badge className="ml-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-700">
                Draft
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="text-gray-700">
                Cancel
              </Button>
              <Button className="bg-violet-600 hover:bg-violet-700">Save Invoice</Button>
            </div>
          </div>
        </header>

        <div className="border-b px-6 py-3">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground mr-2">Invoice:</span>
              <span className="font-medium">{invoice ? formatCurrency(invoice.amount, invoice.currency_code) : "$0.00"}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">PO:</span>
              <span className="font-medium">{invoice?.po_number || "None"}</span>
            </div>
            {invoice?.po_number && (
            <div>
              <span className="text-muted-foreground mr-2">Diff:</span>
                <span className="font-medium text-red-500">{formatCurrency(invoice.amount, invoice.currency_code)}</span>
            </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="flex-1 flex flex-col">
          <div className="border-b px-6">
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

          <TabsContent value="details" className="flex-1 p-0 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 h-full">
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="font-medium">Invoice Preview</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                    {fileData && (
                      <Button variant="ghost" size="icon" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex items-center text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <span className="w-12 text-center">{zoomLevel}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center p-2 h-[600px] bg-gray-50 overflow-auto" ref={pdfContainerRef}>
                  {fileData ? (
                    fileType === 'application/pdf' ? (
                      <div className="relative w-full h-full">
                        <iframe 
                          src={fileData} 
                          className="w-full h-full border-0" 
                          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                        />
                      </div>
                    ) : fileType?.startsWith('image/') ? (
                      <div className="flex items-center justify-center h-full">
                        <img 
                          src={fileData} 
                          alt="Invoice preview" 
                          className="max-w-full max-h-full object-contain"
                          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-8">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">CSV File</p>
                        <p className="text-sm text-muted-foreground">CSV files cannot be previewed.</p>
                      </div>
                    )
                  ) : (
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
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-medium">Invoice Information</h3>
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    <Edit className="h-4 w-4" />
                    Edit Details
                  </Button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Invoice Number</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">{invoice?.number || "Not specified"}</div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Vendor</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">{invoice?.vendor || "Not specified"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Invoice Date</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">{formatDate(invoice?.date)}</div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Due Date</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">{formatDate(invoice?.due_date)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Payment Terms</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">
                        {invoice?.payment_term_days ? `Net ${invoice.payment_term_days}` : "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Currency</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">{invoice?.currency_code || "USD"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Tax Amount</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">
                        {invoice?.tax_amount !== undefined ? formatCurrency(invoice.tax_amount, invoice.currency_code) : "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Total Amount</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">
                        {invoice?.amount !== undefined ? formatCurrency(invoice.amount, invoice.currency_code) : "Not specified"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Linked Purchase Orders</label>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Plus className="h-3 w-3" />
                        Add PO
                      </Button>
                    </div>
                    <div className="border rounded-md p-4 bg-gray-50 text-sm text-muted-foreground">
                      {invoice?.po_number ? 
                        `PO Number: ${invoice.po_number}` : 
                        "No purchase orders linked to this invoice. Click \"Add PO\" to link a purchase order."}
                    </div>
                </div>
              </div>
            </div>

              {/* Line Items Section */}
              <div className="border rounded-lg overflow-hidden col-span-1 md:col-span-2">
                <div className="flex items-center justify-between p-4 border-b">
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
          </TabsContent>

          <TabsContent value="activity" className="p-6 mt-0">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
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
          </TabsContent>

          <TabsContent value="attachments" className="p-6 mt-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Attachments</h2>
                <Button className="bg-violet-600 hover:bg-violet-700" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
