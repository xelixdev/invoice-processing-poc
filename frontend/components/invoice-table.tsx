"use client"

import { Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from "react"
import type { Invoice } from "@/lib/data-utils"

const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app')

// Helper function to get status badge colors
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'draft':
      return 'bg-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-600'
    case 'processing':
      return 'bg-blue-100 text-blue-600 hover:bg-blue-100 hover:text-blue-600'
    case 'review':
      return 'bg-yellow-100 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-600'
    case 'pending_approval':
      return 'bg-orange-100 text-orange-600 hover:bg-orange-100 hover:text-orange-600'
    case 'in_approval':
      return 'bg-amber-100 text-amber-600 hover:bg-amber-100 hover:text-amber-600'
    case 'approved':
      return 'bg-green-100 text-green-600 hover:bg-green-100 hover:text-green-600'
    case 'escalated':
      return 'bg-red-100 text-red-600 hover:bg-red-100 hover:text-red-600'
    case 'paid':
      return 'bg-violet-100 text-violet-600 hover:bg-violet-100 hover:text-violet-600'
    case 'cancelled':
      return 'bg-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-700'
    default:
      return 'bg-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-600'
  }
}

// Helper function to capitalize and format status text
const formatStatus = (status: string) => {
  if (!status) return 'Unknown'
  
  // Handle underscore-separated statuses
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function InvoiceTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        console.log(`Fetching invoices directly from Railway: ${BACKEND_URL}/api/invoices/`)
        
        const response = await fetch(`${BACKEND_URL}/api/invoices/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          // Add timeout and CORS mode
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
        setInvoices(transformedData)
        
      } catch (error) {
        console.error("Error fetching invoices from Railway:", error)
        setError(error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading invoices...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="text-red-600">Error loading invoices: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (invoices.length === 0) {
    return <div className="flex justify-center items-center h-64">No invoices found.</div>
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>PO #</TableHead>
            <TableHead>GR #</TableHead>
            <TableHead className="w-[140px]">Assigned To</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="hover:bg-gray-50">
              <TableCell>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(invoice.status)} rounded-full px-3 py-0.5 font-medium`}
                >
                  {formatStatus(invoice.status)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-violet-600">{invoice.invoiceNumber}</TableCell>
              <TableCell>
                {typeof invoice.vendor === 'string' ? invoice.vendor : invoice.vendor?.name || invoice.vendor_name}
              </TableCell>
              <TableCell>
                {typeof invoice.amount === 'string' 
                  ? invoice.amount 
                  : `$${Number(invoice.amount || invoice.total_due || 0).toFixed(2)}`
                }
              </TableCell>
              <TableCell>{invoice.currency}</TableCell>
              <TableCell>{invoice.date}</TableCell>
              <TableCell>{invoice.dueDate}</TableCell>
              <TableCell>
                <Circle
                  className={`h-4 w-4 ${
                    invoice.match === "red"
                      ? "fill-red-500 text-red-500"
                      : invoice.match === "yellow"
                        ? "fill-yellow-500 text-yellow-500"
                        : "fill-green-500 text-green-500"
                  }`}
                />
              </TableCell>
              <TableCell className="text-violet-600">{invoice.poNumber}</TableCell>
              <TableCell>{invoice.grNumber}</TableCell>
              <TableCell>
                {invoice.assigned_user ? (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-gray-900">
                      {invoice.assigned_user.full_name || invoice.assigned_user.username}
                    </span>
                    {invoice.assigned_user.department && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs w-fit bg-blue-100 text-blue-700 hover:bg-blue-100"
                      >
                        {invoice.assigned_user.department}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 text-gray-500 border-gray-300"
                  >
                    Unassigned
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
