import { promises as fs } from "fs"
import path from "path"
import { parse } from "csv-parse/sync"

// Purchase Order Types
export interface PurchaseOrderItem {
  PO_Number: string
  Date: string
  Vendor_ID: string
  Vendor_Name: string
  Company_ID: string
  Company_Name: string
  Item_Code: string
  Description: string
  Quantity: string
  Unit_Price: string
  Total: string
  Required_Delivery_Date: string
  Currency: string
  PO_Status: string
}

export interface PurchaseOrder {
  poNumber: string
  date: string
  vendorId: string
  vendorName: string
  companyId: string
  companyName: string
  items: PurchaseOrderItem[]
  totalAmount: number
  currency: string
  status: string
}

// Invoice Types
export interface InvoiceItem {
  Invoice_Number: string
  Date: string
  PO_Number: string
  GR_Number: string
  Vendor_ID: string
  Vendor_Name: string
  Company_ID: string
  Company_Name: string
  Item_Code: string
  Description: string
  Quantity: string
  Unit_Price: string
  Total: string
  Discount_Percent: string
  Discount_Amount: string
  Sub_Total: string
  Tax_Rate: string
  Tax_Amount: string
  Shipping: string
  Total_Due: string
  Currency: string
  Due_Date: string
  Payment_Terms: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  poNumber: string
  grNumber: string
  vendor: string
  amount: string
  currency: string
  status: "Paid" | "In Approval" | "Approved" | "Review"
  match: "red" | "yellow" | "green"
  items: InvoiceItem[]
}

// Goods Received Types
export interface GoodsReceivedItem {
  GR_Number: string
  Date: string
  PO_Number: string
  Vendor_ID: string
  Vendor_Name: string
  Company_ID: string
  Company_Name: string
  Item_Code: string
  Description: string
  Quantity_Ordered: string
  Quantity_Received: string
  Delivery_Status: string
  Notes: string
}

export interface GoodsReceived {
  id: string
  grNumber: string
  date: string
  poNumber: string
  vendor: string
  status: string
  items: GoodsReceivedItem[]
}

// CSV Loading Functions
export async function loadCSV(filename: string, options = {}): Promise<any[]> {
  try {
    const filePath = path.join(process.cwd(), "fixtures", filename)
    const fileContent = await fs.readFile(filePath, "utf8")

    const defaultOptions = {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      escape: false,
      quote: '"',
      ltrim: true,
      rtrim: true,
    }

    const records = parse(fileContent, { ...defaultOptions, ...options })
    return records
  } catch (error) {
    console.error(`Error loading ${filename}:`, error)
    return []
  }
}

// Purchase Order Functions
export async function loadPurchaseOrdersFromCSV(): Promise<PurchaseOrderItem[]> {
  return loadCSV("purchase-orders.csv")
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const items = await loadPurchaseOrdersFromCSV()

  // Group items by PO number
  const poMap = new Map<string, PurchaseOrderItem[]>()

  items.forEach((item) => {
    if (!poMap.has(item.PO_Number)) {
      poMap.set(item.PO_Number, [])
    }
    poMap.get(item.PO_Number)?.push(item)
  })

  // Convert to PurchaseOrder objects
  const purchaseOrders: PurchaseOrder[] = []

  poMap.forEach((items, poNumber) => {
    if (items.length > 0) {
      const firstItem = items[0]
      const totalAmount = items.reduce((sum, item) => sum + Number.parseFloat(item.Total), 0)

      purchaseOrders.push({
        poNumber,
        date: firstItem.Date,
        vendorId: firstItem.Vendor_ID,
        vendorName: firstItem.Vendor_Name,
        companyId: firstItem.Company_ID,
        companyName: firstItem.Company_Name,
        items,
        totalAmount,
        currency: firstItem.Currency,
        status: firstItem.PO_Status,
      })
    }
  })

  return purchaseOrders
}

// Invoice Functions
export async function loadInvoicesFromCSV(): Promise<InvoiceItem[]> {
  return loadCSV("invoices.csv")
}

export async function getInvoices(): Promise<Invoice[]> {
  const items = await loadInvoicesFromCSV()

  // Group items by Invoice number
  const invoiceMap = new Map<string, InvoiceItem[]>()

  items.forEach((item) => {
    if (!invoiceMap.has(item.Invoice_Number)) {
      invoiceMap.set(item.Invoice_Number, [])
    }
    invoiceMap.get(item.Invoice_Number)?.push(item)
  })

  // Convert to Invoice objects
  const invoices: Invoice[] = []
  const today = new Date()

  invoiceMap.forEach((items, invoiceNumber) => {
    if (items.length > 0) {
      const firstItem = items[0]
      const totalAmount = items.reduce((sum, item) => sum + Number.parseFloat(item.Total_Due), 0)

      // Determine status based on due date
      const dueDate = new Date(firstItem.Due_Date)
      let status: "Paid" | "In Approval" | "Approved" | "Review"

      if (dueDate < today) {
        status = "Paid"
      } else {
        const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff < 7) {
          status = "Approved"
        } else if (daysDiff < 14) {
          status = "In Approval"
        } else {
          status = "Review"
        }
      }

      // Determine match status
      const matchOptions: ("red" | "yellow" | "green")[] = ["red", "yellow", "green"]
      const match = matchOptions[Math.floor(Math.random() * matchOptions.length)]

      invoices.push({
        id: invoiceNumber,
        invoiceNumber,
        date: firstItem.Date,
        dueDate: firstItem.Due_Date,
        poNumber: firstItem.PO_Number || "—",
        grNumber: firstItem.GR_Number || "—",
        vendor: firstItem.Vendor_Name,
        amount: `$${totalAmount.toFixed(2)}`,
        currency: firstItem.Currency,
        status,
        match,
        items,
      })
    }
  })

  return invoices
}

// Goods Received Functions
export async function loadGoodsReceivedFromCSV(): Promise<GoodsReceivedItem[]> {
  return loadCSV("goods-received.csv")
}

export async function getGoodsReceived(): Promise<GoodsReceived[]> {
  const items = await loadGoodsReceivedFromCSV()

  // Group items by GR number
  const grMap = new Map<string, GoodsReceivedItem[]>()

  items.forEach((item) => {
    if (!grMap.has(item.GR_Number)) {
      grMap.set(item.GR_Number, [])
    }
    grMap.get(item.GR_Number)?.push(item)
  })

  // Convert to GoodsReceived objects
  const goodsReceived: GoodsReceived[] = []

  grMap.forEach((items, grNumber) => {
    if (items.length > 0) {
      const firstItem = items[0]

      // Determine overall status
      const statuses = new Set(items.map((item) => item.Delivery_Status))
      let status = "Complete"

      if (statuses.has("Partial")) {
        status = "Partial"
      }

      goodsReceived.push({
        id: grNumber,
        grNumber,
        date: firstItem.Date,
        poNumber: firstItem.PO_Number,
        vendor: firstItem.Vendor_Name,
        status,
        items,
      })
    }
  })

  return goodsReceived
}

// Utility Functions
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}
