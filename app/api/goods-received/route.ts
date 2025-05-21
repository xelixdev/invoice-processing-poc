import { getGoodsReceived } from "@/lib/data-utils"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const goodsReceived = await getGoodsReceived()
    return NextResponse.json(goodsReceived)
  } catch (error) {
    console.error("Error fetching goods received:", error)
    return NextResponse.json({ error: "Failed to fetch goods received" }, { status: 500 })
  }
}
