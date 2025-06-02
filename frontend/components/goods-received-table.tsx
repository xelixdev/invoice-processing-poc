"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import type { GoodsReceived } from "@/lib/data-utils"

const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app')

export default function GoodsReceivedTable() {
  const [goodsReceived, setGoodsReceived] = useState<GoodsReceived[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGoodsReceived() {
      try {
        console.log(`Fetching goods received directly from Railway: ${BACKEND_URL}/api/goods-received/`)
        
        const response = await fetch(`${BACKEND_URL}/api/goods-received/`, {
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
        setGoodsReceived(transformedData)
        
      } catch (error) {
        console.error("Error fetching goods received from Railway:", error)
        setError(error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }

    fetchGoodsReceived()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading goods receipt notes...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="text-red-600">Error loading goods received: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (goodsReceived.length === 0) {
    return <div className="flex justify-center items-center h-64">No goods receipt notes found.</div>
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
