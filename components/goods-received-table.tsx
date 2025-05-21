"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import type { GoodsReceived } from "@/lib/data-utils"

export default function GoodsReceivedTable() {
  const [goodsReceived, setGoodsReceived] = useState<GoodsReceived[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGoodsReceived() {
      try {
        const response = await fetch("/api/goods-received")
        const data = await response.json()
        setGoodsReceived(data)
      } catch (error) {
        console.error("Error fetching goods received:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGoodsReceived()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading goods received notes...</div>
  }

  if (goodsReceived.length === 0) {
    return <div className="flex justify-center items-center h-64">No goods received notes found.</div>
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>GR #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>PO #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goodsReceived.map((gr) => (
            <TableRow key={gr.id} className="hover:bg-gray-50">
              <TableCell className="font-medium text-violet-600">{gr.grNumber}</TableCell>
              <TableCell>{gr.date}</TableCell>
              <TableCell className="text-violet-600">{gr.poNumber}</TableCell>
              <TableCell>{gr.vendor}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`${
                    gr.status === "Complete"
                      ? "bg-green-100 text-green-600 hover:bg-green-100 hover:text-green-600"
                      : "bg-yellow-100 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-600"
                  } rounded-full px-3 py-0.5 font-medium`}
                >
                  {gr.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
