import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app'

export async function GET() {
  try {
    console.log(`Fetching goods received from: ${BACKEND_URL}/api/goods-received/`)
    
    const response = await fetch(`${BACKEND_URL}/api/goods-received/`, {
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
    console.log(`Successfully fetched ${data.results?.length || 0} goods received from backend`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching goods received from backend:", error)
    return NextResponse.json({ error: "Failed to fetch goods received" }, { status: 500 })
  }
}
