"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Sidebar from "@/components/sidebar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function UploadInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      // Allow PDF, CSV and common image formats
      const acceptedTypes = ['application/pdf', 'text/csv', 'image/jpeg', 'image/jpg', 'image/png']
      if (acceptedTypes.includes(droppedFile.type)) {
        setFile(droppedFile)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, CSV, or image file.",
          variant: "destructive",
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)

    try {
      // Create form data
      const formData = new FormData()
      formData.append("file", file)

      console.log("Starting upload process...")

      // Call our invoice extraction API
      const response = await fetch("/api/extract-and-match", {
        method: "POST",
        body: formData,
      })

      const extractedData = await response.json()
      console.log("Received response:", response.status, extractedData)

      if (!response.ok) {
        throw new Error(extractedData.error || "Failed to extract invoice data")
      }

      // The new simplified response structure from extract-and-match:
      // {
      //   invoices: [{ invoice data + matching: { matched_po, match_confidence, etc. } }]
      // }

      // Extract invoices from the simplified response
      let invoices = []
      if (extractedData.invoices && Array.isArray(extractedData.invoices)) {
        invoices = extractedData.invoices.map((invoice: any) => ({
          invoice_number: invoice.invoice_number,
          po_number: invoice.po_number,
          amount: invoice.amount,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          currency_code: invoice.currency_code,
          date: invoice.date,
          due_date: invoice.due_date,
          payment_term_days: invoice.payment_term_days,
          vendor: invoice.vendor,
          billing_address: invoice.billing_address,
          payment_method: invoice.payment_method,
          line_items: invoice.line_items || []
        }))
      }

      // Create compatible format for the create page
      const compatibleData = {
        document_type: "invoice",
        invoices: invoices
      }

      // Check if we have invoice data
      if (!compatibleData.invoices || compatibleData.invoices.length === 0) {
        console.log("No invoice data found in response")
        toast({
          title: "No invoice data found",
          description: "Could not extract invoice information from the file.",
          variant: "destructive",
        })
        setIsUploading(false)
        return
      }

      console.log("Invoice data found, storing in sessionStorage...")
      // Store the compatible data for the create page
      sessionStorage.setItem("extractedInvoiceData", JSON.stringify(compatibleData))
      
      // Also store the full simplified extract-and-match results for future use
      sessionStorage.setItem("fullExtractAndMatchData", JSON.stringify(extractedData))
      console.log("Data stored in sessionStorage")

      // Also store the file data for preview
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        console.log("Processing file for preview...")
        // Read the file as data URL for preview
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            console.log("File read successfully, storing file data...")
            // Store the file data URL and type
            sessionStorage.setItem("invoiceFileData", e.target.result as string)
            sessionStorage.setItem("invoiceFileType", file.type)
            sessionStorage.setItem("invoiceFileName", file.name)
            
            console.log("Navigating to create page...")
            // Navigate to the create page
            router.push("/invoices/create")
          }
        }
        reader.onerror = () => {
          // If file reading fails, continue without preview
          console.error("Error reading file for preview")
          console.log("Navigating to create page without preview...")
          router.push("/invoices/create")
        }
        reader.readAsDataURL(file)
      } else {
        console.log("CSV file, no preview needed. Navigating to create page...")
        // For CSV files, we don't need a preview
        sessionStorage.removeItem("invoiceFileData")
        sessionStorage.removeItem("invoiceFileType")
        sessionStorage.removeItem("invoiceFileName")
        router.push("/invoices/create")
      }
    } catch (error) {
      console.error("Error processing invoice:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process the invoice",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="border-b">
          <div className="flex h-16 items-center px-4">
            <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-6">Create Invoice</h1>

            <div className="bg-white rounded-lg border p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">Upload Invoice</h2>
              <p className="text-muted-foreground mb-6">
                Upload a PDF, CSV, or image file to automatically extract invoice information.
              </p>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDragging ? "border-violet-500 bg-violet-50" : "border-gray-200"
                } transition-colors duration-200 mb-4`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {!file ? (
                  <div>
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-1">Drag and drop your invoice file here</p>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
                    <Input
                      type="file"
                      accept=".pdf,.csv,.jpg,.jpeg,.png"
                      className="hidden"
                      id="invoice-upload"
                      onChange={handleFileChange}
                    />
                    <Button variant="outline" onClick={() => document.getElementById("invoice-upload")?.click()}>
                      Browse Files
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-violet-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  disabled={!file || isUploading}
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <>
                      <span className="mr-2">Processing...</span>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </>
                  ) : (
                    "Upload Invoice"
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-medium mb-4">What happens next?</h2>
              <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
                <li>Your invoice will be processed using AI extraction</li>
                <li>Invoice information will be automatically extracted including line items</li>
                <li>You can review and edit the extracted information</li>
                <li>Once approved, the invoice will be added to your system</li>
              </ol>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
