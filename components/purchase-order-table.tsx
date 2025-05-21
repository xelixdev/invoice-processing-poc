"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import type { PurchaseOrder } from "@/lib/data-utils"

export default function PurchaseOrderTable() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPurchaseOrders() {
      try {
        const response = await fetch("/api/purchase-orders")
        const data = await response.json()
        setPurchaseOrders(data)
      } catch (error) {
        console.error("Error fetching purchase orders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseOrders()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading purchase orders...</div>
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
            <TableRow key={po.poNumber} className="hover:bg-gray-50">
              <TableCell className="font-medium text-violet-600">{po.poNumber}</TableCell>
              <TableCell>{po.date}</TableCell>
              <TableCell>{po.vendorName}</TableCell>
              <TableCell>{po.companyName}</TableCell>
              <TableCell>${po.totalAmount.toFixed(2)}</TableCell>
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
    </div>
  )
}
