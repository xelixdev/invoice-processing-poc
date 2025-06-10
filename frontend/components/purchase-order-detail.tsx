"use client"

import { useState, useEffect } from "react"
import { Calendar, Building2, CreditCard, Truck, Package, User, DollarSign, FileText, List } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app')

interface LineItem {
  id: number
  item_code: string
  item_description: string
  quantity: string
  unit_price: string
  total: string
}

interface PurchaseOrderDetail {
  id: number
  po_number: string
  date: string
  required_delivery_date: string
  vendor_id: string
  vendor_name: string
  company_id: string
  company_name: string
  currency: string
  status: string
  total_amount: string
  line_items: LineItem[]
}

interface PurchaseOrderDetailProps {
  isOpen: boolean
  onClose: () => void
  poNumber: string | null
}

export default function PurchaseOrderDetail({ isOpen, onClose, poNumber }: PurchaseOrderDetailProps) {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && poNumber) {
      fetchPurchaseOrderDetail()
    }
  }, [isOpen, poNumber])

  const fetchPurchaseOrderDetail = async () => {
    if (!poNumber) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/purchase-orders/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const data = await response.json()
      const purchaseOrders = data.results || data
      
      // Find the specific purchase order by po_number
      const po = purchaseOrders.find((p: any) => p.po_number === poNumber)
      
      if (!po) {
        throw new Error(`Purchase Order ${poNumber} not found`)
      }
      
      setPurchaseOrder(po)
      
    } catch (error) {
      console.error("Error fetching purchase order detail:", error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string | number, currency = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numAmount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-violet-600" />
            Purchase Order Details
          </SheetTitle>
          <SheetDescription>
            {poNumber && `Detailed information for PO: ${poNumber}`}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading purchase order details...</div>
          </div>
        )}

        {error && (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <div className="text-red-600 text-center">{error}</div>
            <Button onClick={fetchPurchaseOrderDetail} variant="outline">
              Retry
            </Button>
          </div>
        )}

        {purchaseOrder && !loading && !error && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Details & Line Items
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF Document
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Header Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-violet-600">{purchaseOrder.po_number}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Order Date</div>
                        <div className="font-medium">{formatDate(purchaseOrder.date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Required Delivery</div>
                        <div className="font-medium">{formatDate(purchaseOrder.required_delivery_date)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Vendor</div>
                        <div className="font-medium">{purchaseOrder.vendor_name}</div>
                        <div className="text-sm text-gray-500">{purchaseOrder.vendor_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Company</div>
                        <div className="font-medium">{purchaseOrder.company_name}</div>
                        <div className="text-sm text-gray-500">{purchaseOrder.company_id}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Total Amount</div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Status</div>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-600 hover:bg-green-100 hover:text-green-600 rounded-full px-3 py-1 font-medium"
                        >
                          {purchaseOrder.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Line Items ({purchaseOrder.line_items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-24">Item Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right w-20">Qty</TableHead>
                          <TableHead className="text-right w-28">Unit Price</TableHead>
                          <TableHead className="text-right w-28">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrder.line_items.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-violet-600">
                              {item.item_code}
                            </TableCell>
                            <TableCell>{item.item_description}</TableCell>
                            <TableCell className="text-right">{parseFloat(item.quantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unit_price, purchaseOrder.currency)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total, purchaseOrder.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Summary Row */}
                  <div className="mt-4 flex justify-end">
                    <div className="bg-gray-50 rounded-lg p-4 min-w-64">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="document" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-violet-600" />
                    Purchase Order Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <iframe
                      src={`/fixtures/Purchase_Order_${purchaseOrder.po_number}.pdf`}
                      className="w-full h-[600px]"
                      title="Purchase Order PDF"
                    />
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(`/fixtures/Purchase_Order_${purchaseOrder.po_number}.pdf`, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Open in New Tab
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
} 