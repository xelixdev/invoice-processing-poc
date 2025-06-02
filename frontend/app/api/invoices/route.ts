import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app'

export async function GET() {
  try {
    console.log(`Fetching invoices from: ${BACKEND_URL}/api/invoices/`)
    
    const response = await fetch(`${BACKEND_URL}/api/invoices/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Backend API error: ${response.status} - ${errorText}`)
      throw new Error(`Backend API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log(`Successfully fetched data from backend:`, {
      count: data.count,
      resultsLength: data.results?.length,
      hasNext: !!data.next,
      hasPrevious: !!data.previous
    })
    
    // Transform Django REST Framework pagination format to match frontend expectations
    const transformedData = data.results || data
    
    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("Error fetching invoices from backend:", error)
    
    // More detailed error information
    const errorResponse = {
      error: "Failed to fetch invoices from backend",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
