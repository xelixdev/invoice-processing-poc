import { getPurchaseOrders } from "@/lib/data-utils"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const purchaseOrders = await getPurchaseOrders()
    return NextResponse.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}
