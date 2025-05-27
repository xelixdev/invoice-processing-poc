import { Search, SlidersHorizontal, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Sidebar from "@/components/sidebar"
import PurchaseOrderTable from "@/components/purchase-order-table"

export default function PurchaseOrdersPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="border-b">
          <div className="flex h-16 items-center px-4 gap-6">
            <nav className="flex items-center space-x-4 lg:space-x-6">
              <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Dashboard
              </a>
              <a href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Invoices
              </a>
              <a
                href="/purchase-orders"
                className="text-sm font-medium text-primary transition-colors bg-primary/10 px-3 py-1 rounded-full"
              >
                Purchase Orders
              </a>
              <a
                href="/goods-received"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Goods Receipt Notes
              </a>
            </nav>
            <div className="ml-auto flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
            <Button className="bg-violet-600 hover:bg-violet-700 invisible">Create Invoice</Button>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-2.5 top-2.5 h-5 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search purchase orders..." className="w-full pl-8 bg-white" />
                </div>
                <Button variant="outline" className="flex items-center gap-2 border-violet-600 text-violet-600 hover:bg-violet-50">
                  <SlidersHorizontal className="h-4 w-4" />
                  Columns & Filters
                </Button>
              </div>
              <Tabs defaultValue="all" className="w-fit">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger
                    value="all"
                    className="bg-violet-600 text-white data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <PurchaseOrderTable />
          </div>
        </main>
      </div>
    </div>
  )
}
