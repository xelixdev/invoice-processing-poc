"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import type { PurchaseOrder } from "@/lib/data-utils"
import PurchaseOrderDetail from "@/components/purchase-order-detail"

const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app')

export default function PurchaseOrderTable() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoNumber, setSelectedPoNumber] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    async function fetchPurchaseOrders() {
      try {
        console.log(`Fetching purchase orders directly from Railway: ${BACKEND_URL}/api/purchase-orders/`)
        
        const response = await fetch(`${BACKEND_URL}/api/purchase-orders/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(30000),
          mode: 'cors'
        })

        console.log(`Response status: ${response.status}`)
        
        if (!response.ok) {
          throw new Error(`Railway API returned ${response.status}`)
        }

        const data = await response.json()
        console.log(`Successfully fetched data from Railway:`, {
          count: data.count,
          resultsLength: data.results?.length
        })
        
        // Transform Django REST Framework pagination format to match frontend expectations
        const transformedData = data.results || data
        setPurchaseOrders(transformedData)
        
      } catch (error) {
        console.error("Error fetching purchase orders from Railway:", error)
        setError(error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseOrders()
  }, [])

  const handleRowClick = (poNumber: string) => {
    setSelectedPoNumber(poNumber)
    setIsDetailOpen(true)
  }

  const handleDetailClose = () => {
    setIsDetailOpen(false)
    setSelectedPoNumber(null)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading purchase orders...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="text-red-600">Error loading purchase orders: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (purchaseOrders.length === 0) {
    return <div className="flex justify-center items-center h-64">No purchase orders found.</div>
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>PO #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.map((po) => (
            <TableRow 
              key={po.poNumber} 
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleRowClick(po.poNumber)}
            >
              <TableCell className="font-medium text-violet-600">{po.poNumber}</TableCell>
              <TableCell>{po.date}</TableCell>
              <TableCell>{po.vendorName}</TableCell>
              <TableCell>{po.companyName}</TableCell>
              <TableCell>${Number(po.totalAmount || po.total_amount || 0).toFixed(2)}</TableCell>
              <TableCell>{po.currency}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-600 hover:bg-green-100 hover:text-green-600 rounded-full px-3 py-0.5 font-medium"
                >
                  {po.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <PurchaseOrderDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        poNumber={selectedPoNumber}
      />
    </div>
  )
}
