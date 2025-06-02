import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app'

export async function GET() {
  try {
    console.log(`Fetching purchase orders from: ${BACKEND_URL}/api/purchase-orders/`)
    
    const response = await fetch(`${BACKEND_URL}/api/purchase-orders/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`Backend API returned ${response.status}`)
    }

    const data = await response.json()
    console.log(`Successfully fetched ${data.results?.length || 0} purchase orders from backend`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching purchase orders from backend:", error)
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}
