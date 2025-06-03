"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, FileText, Edit, Save, AlertCircle, CheckCircle, X, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import Link from "next/link"

interface InvoiceData {
  document_type: string;
  invoices: Invoice[];
  ai_service_used?: string;
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

export default function ExtractionReviewPage() {
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isIncomplete, setIsIncomplete] = useState(false)
  const [incompletionReason, setIncompletionReason] = useState("")
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Retrieve the extracted data from sessionStorage
    const storedData = sessionStorage.getItem("extractedInvoiceData")
    if (storedData) {
      const parsedData = JSON.parse(storedData) as InvoiceData
      setExtractedData(parsedData)
      
      // Set the first invoice as the current one
      if (parsedData.invoices && parsedData.invoices.length > 0) {
        setInvoice({ ...parsedData.invoices[0] })
      }
    } else {
      // If no extracted data, redirect back to upload
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

  const handleFieldChange = (field: keyof Invoice, value: string | number) => {
    if (!invoice) return
    setInvoice({
      ...invoice,
      [field]: value
    })
  }

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    if (!invoice) return
    const updatedLineItems = [...invoice.line_items]
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value
    }
    setInvoice({
      ...invoice,
      line_items: updatedLineItems
    })
  }

  const addLineItem = () => {
    if (!invoice) return
    setInvoice({
      ...invoice,
      line_items: [
        ...invoice.line_items,
        { description: "", quantity: 0, unit_price: 0, total: 0 }
      ]
    })
  }

  const removeLineItem = (index: number) => {
    if (!invoice) return
    const updatedLineItems = invoice.line_items.filter((_, i) => i !== index)
    setInvoice({
      ...invoice,
      line_items: updatedLineItems
    })
  }

  const handleSaveChanges = () => {
    if (!invoice || !extractedData) return
    
    // Update the extracted data with changes
    const updatedData = {
      ...extractedData,
      invoices: [invoice]
    }
    
    // Store updated data back to sessionStorage
    sessionStorage.setItem("extractedInvoiceData", JSON.stringify(updatedData))
    setIsEditing(false)
    
    toast({
      title: "Changes saved",
      description: "Your edits have been saved successfully.",
    })
  }

  const handleMarkIncomplete = () => {
    if (!incompletionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for marking this invoice as incomplete.",
        variant: "destructive"
      })
      return
    }
    
    // In a real app, you'd save this status to the backend
    toast({
      title: "Invoice marked as incomplete",
      description: "This invoice has been flagged for manual review.",
    })
    
    // Redirect back to upload for a new invoice
    router.push("/invoices/upload")
  }

  const handleProceedToMatching = async () => {
    if (!invoice) return
    
    setIsMatching(true)
    
    // Simulate quantum matching process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Store the confirmed data and proceed to matching
    const confirmedData = {
      ...extractedData,
      invoices: [invoice],
      extraction_confirmed: true
    }
    sessionStorage.setItem("extractedInvoiceData", JSON.stringify(confirmedData))
    router.push("/invoices/create")
  }

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const renderFilePreview = () => {
    if (!fileData || !fileType) return null

    if (fileType === "application/pdf") {
      return (
        <iframe
          src={fileData}
          className="w-full h-[800px] border rounded-lg"
          title="Invoice Preview"
        />
      )
    } else if (fileType.startsWith("image/")) {
      return (
        <img
          src={fileData}
          alt="Invoice Preview"
          className="w-full h-auto min-h-[600px] max-h-[800px] object-contain border rounded-lg bg-gray-50"
        />
      )
    }
    return null
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No extracted data found</h2>
            <p className="text-muted-foreground mb-4">Please upload an invoice first.</p>
            <Button asChild>
              <Link href="/invoices/upload">Upload Invoice</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Quantum Matching Loading Screen */}
        {isMatching && (
          <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="relative mb-8">
                  {/* Quantum particles animation */}
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-4 border-violet-400/80 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-purple-400/80 rounded-full animate-spin animate-reverse" style={{animationDuration: '2s'}}></div>
                    <div className="absolute inset-4 border-4 border-indigo-400/80 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
                    <div className="absolute inset-6 border-4 border-cyan-400/80 rounded-full animate-spin animate-reverse" style={{animationDuration: '1.5s'}}></div>
                    
                    {/* Quantum core */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full animate-pulse shadow-lg"></div>
                    </div>
                    
                    {/* Floating particles */}
                    <div className="absolute -top-4 -left-4 w-2 h-2 bg-violet-400 rounded-full animate-ping shadow-lg"></div>
                    <div className="absolute -top-2 -right-6 w-1 h-1 bg-purple-400 rounded-full animate-ping shadow-lg" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute -bottom-4 -right-4 w-3 h-3 bg-indigo-400 rounded-full animate-ping shadow-lg" style={{animationDelay: '1s'}}></div>
                    <div className="absolute -bottom-2 -left-6 w-1 h-1 bg-cyan-400 rounded-full animate-ping shadow-lg" style={{animationDelay: '1.5s'}}></div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Quantum Matching in Progress
                </h2>
                
                <div className="flex items-center justify-center space-x-1 mb-4">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed">
                  Analyzing invoice against purchase orders and goods receipts...
                </p>
              </div>
            </div>
          </div>
        )}

        <header className="border-b">
          <div className="flex h-16 items-center px-4 justify-between">
            <Link href="/invoices/upload" className="flex items-center text-sm font-medium text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Upload
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {extractedData?.ai_service_used || "AI"} Extracted
              </Badge>
              {isEditing && (
                <Badge variant="outline">Editing Mode</Badge>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-2">Review Extracted Information</h1>
              <p className="text-muted-foreground">
                Please verify the extracted information is correct before proceeding to invoice matching.
              </p>
            </div>

            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                AI extraction completed successfully. Please review all fields and make any necessary corrections.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
              {/* Left Column - Invoice Preview (Larger) */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Original Invoice
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    {fileData ? (
                      renderFilePreview()
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-16 w-16 mx-auto mb-4" />
                        <p>No preview available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Extracted Data (Smaller) */}
              <div className="space-y-3 max-h-[900px] overflow-y-auto overflow-x-hidden">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      Invoice Information
                      <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (isEditing) {
                            handleSaveChanges()
                          } else {
                            setIsEditing(true)
                          }
                        }}
                      >
                        {isEditing ? (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </>
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="invoice-number" className="text-xs font-medium">Invoice #</Label>
                        <Input
                          id="invoice-number"
                          value={invoice.invoice_number || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("invoice_number", e.target.value)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="po-number" className="text-xs font-medium">PO #</Label>
                        <Input
                          id="po-number"
                          value={invoice.po_number || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("po_number", e.target.value)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Vendor */}
                    <div>
                      <Label htmlFor="vendor" className="text-xs font-medium">Vendor</Label>
                      <Input
                        id="vendor"
                        value={invoice.vendor || ""}
                        disabled={!isEditing}
                        onChange={(e) => handleFieldChange("vendor", e.target.value)}
                        className="w-full h-8 text-sm"
                      />
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="date" className="text-xs font-medium">Invoice Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={invoice.date || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("date", e.target.value)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="due-date" className="text-xs font-medium">Due Date</Label>
                        <Input
                          id="due-date"
                          type="date"
                          value={invoice.due_date || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("due_date", e.target.value)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Financial Info Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="currency" className="text-xs font-medium">Currency</Label>
                        <Input
                          id="currency"
                          value={invoice.currency_code || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("currency_code", e.target.value)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subtotal" className="text-xs font-medium">Subtotal</Label>
                        <Input
                          id="subtotal"
                          type="number"
                          step="0.01"
                          value={invoice.amount || 0}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("amount", parseFloat(e.target.value) || 0)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tax" className="text-xs font-medium">Tax</Label>
                        <Input
                          id="tax"
                          type="number"
                          step="0.01"
                          value={invoice.tax_amount || 0}
                          disabled={!isEditing}
                          onChange={(e) => handleFieldChange("tax_amount", parseFloat(e.target.value) || 0)}
                          className="w-full h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div>
                      <Label htmlFor="payment-terms" className="text-xs font-medium">Payment Terms (Days)</Label>
                      <Input
                        id="payment-terms"
                        type="number"
                        value={invoice.payment_term_days || 0}
                        disabled={!isEditing}
                        onChange={(e) => handleFieldChange("payment_term_days", parseInt(e.target.value) || 0)}
                        className="w-full h-8 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      Line Items ({invoice.line_items.length})
                      {isEditing && (
                        <Button size="sm" variant="outline" onClick={addLineItem} className="h-7 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {invoice.line_items.map((item, index) => (
                        <div key={index} className="border rounded-md p-2 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">Item {index + 1}</span>
                            {isEditing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeLineItem(index)}
                                className="h-5 w-5 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Description */}
                          <div className="mb-2">
                            <Textarea
                              value={item.description || ""}
                              disabled={!isEditing}
                              onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                              rows={1}
                              className="text-xs w-full resize-none h-6 p-1"
                              placeholder="Description"
                            />
                          </div>
                          
                          {/* Qty, Price, Total in compact grid */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                value={item.quantity || 0}
                                disabled={!isEditing}
                                onChange={(e) => handleLineItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                                className="h-6 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price || 0}
                                disabled={!isEditing}
                                onChange={(e) => handleLineItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Total</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.total || 0}
                                disabled={!isEditing}
                                onChange={(e) => handleLineItemChange(index, "total", parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full h-8 text-xs text-orange-600 border-orange-600 hover:bg-orange-50">
                        <AlertCircle className="h-3 w-3 mr-2" />
                        Mark as Incomplete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark Invoice as Incomplete</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          If essential information is missing from this invoice that cannot be extracted or corrected, 
                          mark it as incomplete for manual review.
                        </p>
                        <div>
                          <Label htmlFor="reason">Reason for incompletion</Label>
                          <Textarea
                            id="reason"
                            placeholder="e.g., Missing vendor information, unclear line items, damaged document..."
                            value={incompletionReason}
                            onChange={(e) => setIncompletionReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIncompletionReason("")}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleMarkIncomplete}>
                            Mark as Incomplete
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    className="w-full h-9 bg-violet-600 hover:bg-violet-700"
                    onClick={handleProceedToMatching}
                    disabled={isMatching}
                  >
                    {isMatching ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm & Proceed to Matching
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 