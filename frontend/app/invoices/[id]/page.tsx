"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Search, Maximize, FileText, Circle, Edit, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Sidebar from "@/components/sidebar"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AssignmentInfoCard from "@/components/assignment-info-card"

interface AssignmentRule {
  id: number
  name: string
  description: string
  department: string
  priority: number
}

interface AssignedUser {
  id: number
  username: string
  full_name: string
  department: string
  email: string
  rule: AssignmentRule
  confidence: number
  explanation: string
}

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const [zoomLevel, setZoomLevel] = useState(100)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [assignedUser, setAssignedUser] = useState<AssignedUser | null>(null)
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true)

  // Mock data - in production this would come from your API
  useEffect(() => {
    // Simulate loading invoice data including file information
    // In production, fetch from API endpoint like /api/invoices/${params.id}
    
    // For demo purposes, let's show an image of an invoice
    // In production, this would be determined by the actual file type
    setFileType('image/png')
    setFileName('invoice-sample.png')
    
    // Using a local sample invoice image for demonstration
    // In production, this would be the actual file URL from your backend
    // For example: setFileData(`${API_URL}/media/invoice_uploads/${invoiceFile}`)
    setFileData('/sample-invoice.png')

    // Simulate loading assignment data from the extract-and-match endpoint
    // In production, fetch from API endpoint like /api/extract-and-match/${params.id}
    setTimeout(() => {
      // Different demo scenarios based on invoice ID
      const invoiceId = parseInt(params.id)
      
      if (invoiceId === 1) {
        // High confidence office furniture assignment
        setAssignedUser({
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
        })
      } else if (invoiceId === 2) {
        // Medium confidence IT equipment assignment
        setAssignedUser({
          id: 13,
          username: "john.smith",
          full_name: "John Smith",
          department: "IT",
          email: "john.smith@company.com",
          rule: {
            id: 1,
            name: "IT Equipment Purchases",
            description: "All IT equipment and software purchases go to IT department",
            department: "IT",
            priority: 1
          },
          confidence: 0.78,
          explanation: "The invoice contains technology-related items that could be IT equipment. However, some items are ambiguous and could also be classified as office supplies."
        })
      } else if (invoiceId === 3) {
        // Low confidence scenario
        setAssignedUser({
          id: 15,
          username: "mike.brown",
          full_name: "Mike Brown", 
          department: "Procurement",
          email: "mike.brown@company.com",
          rule: {
            id: 13,
            name: "Default Procurement",
            description: "All unmatched invoices go to procurement for manual review",
            department: "Procurement",
            priority: 100
          },
          confidence: 0.45,
          explanation: "No specific rules matched this invoice content clearly. Defaulting to procurement team for manual classification and assignment."
        })
      } else {
        // Default high confidence scenario
        setAssignedUser({
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
        })
      }
      
      setIsLoadingAssignment(false)
    }, 1500) // Simulate 1.5s loading time
  }, [params.id])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="border-b">
          <div className="flex h-16 items-center px-4 justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground mr-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Link>
              <h1 className="text-lg font-semibold">Invoice new</h1>
              <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700">
                Approved
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="text-gray-700">
                Reject
              </Button>
              <Button className="bg-violet-600 hover:bg-violet-700">Approve for Payment</Button>
            </div>
          </div>
        </header>

        <div className="border-b px-6 py-3">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground mr-2">Invoice:</span>
              <span className="font-medium">$2,699.95</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">PO:</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">Diff:</span>
              <span className="font-medium text-red-500">$2,699.95</span>
            </div>
          </div>
        </div>

        {/* Assignment Information */}
        <AssignmentInfoCard 
          assignedUser={assignedUser}
          isLoading={isLoadingAssignment}
        />

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

                <div className="flex items-center justify-center p-8 h-[400px] bg-gray-50">
                  {!fileData ? (
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
                  ) : fileType === 'application/pdf' ? (
                    <iframe 
                      src={fileData} 
                      className="w-full h-full border-0 rounded" 
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    />
                  ) : fileType?.startsWith('image/') ? (
                    <img 
                      src={fileData} 
                      alt="Invoice preview" 
                      className="max-w-full max-h-full object-contain"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">File Preview</p>
                      <p className="text-sm text-muted-foreground">Unable to preview this file type.</p>
                    </div>
                  )}
                </div>

                <div className="border-t p-4 flex justify-center">
                  <Button variant="outline" className="text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {fileName || 'Invoice preview'}
                  </Button>
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
                      <div className="border rounded-md p-2.5 bg-gray-50">INV-001</div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Vendor</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">Globex Corp</div>
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
                      <div className="border rounded-md p-2.5 bg-gray-50">January 8th, 2025</div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Due Date</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">February 5th, 2025</div>
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
                      <div className="border rounded-md p-2.5 bg-gray-50">Due on Receipt</div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Currency</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">US Dollar</div>
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
                      <div className="border rounded-md p-2.5 bg-gray-50">Not specified</div>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <label className="text-sm font-medium">Total Amount</label>
                        <div className="ml-1 text-gray-400">
                          <Circle className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="border rounded-md p-2.5 bg-gray-50">USD 2699.95</div>
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
                      No purchase orders linked to this invoice. Click "Add PO" to link a purchase order.
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground pt-4 border-t">Created on Jan 6, 2025</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-4">Line Items</h3>
                <div className="flex items-center gap-4 text-sm mb-2">
                  <div className="flex items-center">
                    <span className="font-medium">2 items</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    <span>0 matched</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                    <span>0 partial</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-red-400"></div>
                    <span>2 missing</span>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto h-8">
                    Collapse
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Description (Invoice)</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                      <TableHead className="w-[120px]">Unit Price</TableHead>
                      <TableHead className="w-[120px]">Total</TableHead>
                      <TableHead>PO Line Source</TableHead>
                      <TableHead>PO Description</TableHead>
                      <TableHead>PO Qty</TableHead>
                      <TableHead>PO Unit Price</TableHead>
                      <TableHead>PO Total</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                      <TableHead className="w-[100px]">Assignee</TableHead>
                      <TableHead className="w-[100px]">Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>1</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                          No Match
                        </Badge>
                      </TableCell>
                      <TableCell>Standing Desk</TableCell>
                      <TableCell>4</TableCell>
                      <TableCell>$599.99</TableCell>
                      <TableCell>$2,399.96</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Select PO line
                        </Button>
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Circle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Circle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">No Status</span>
                      </TableCell>
                      <TableCell>Monitor</TableCell>
                      <TableCell>1</TableCell>
                      <TableCell>$299.99</TableCell>
                      <TableCell>$299.99</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Select PO line
                        </Button>
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Circle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Circle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="bg-gray-50 p-4 border-t">
                  <div className="flex justify-end">
                    <div className="w-[300px] space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Subtotal:</span>
                        <span>$2,699.95</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tax (8.25%):</span>
                        <span>$222.75</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>$2,922.70</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="p-6 mt-0">
            <div className="border rounded-lg p-6">
              <p className="text-muted-foreground">Activity information will be displayed here.</p>
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="p-6 mt-0">
            <div className="border rounded-lg p-6">
              <p className="text-muted-foreground">Attachment information will be displayed here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
