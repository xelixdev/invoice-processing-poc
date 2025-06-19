import { Search } from "lucide-react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilter, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Sidebar from "@/components/sidebar"
import MainHeader from "@/components/main-header"
import InvoiceTable from "@/components/invoice-table"
import Link from "next/link"

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activePage="invoices" />
      <div className="flex-1 flex flex-col overflow-auto">
        <MainHeader activePage="invoices" sidebarContext="invoices" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <Link href="/invoices/upload">
              <Button className="bg-violet-600 hover:bg-violet-700 flex items-center gap-1">
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Create Invoice
              </Button>
            </Link>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-2.5 top-2.5 h-5 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search invoices..." className="w-full pl-8 bg-white" />
                </div>
                <Button variant="outline" className="flex items-center gap-2 border-violet-600 text-violet-600 hover:bg-violet-50">
                  <FontAwesomeIcon icon={faFilter} className="h-4 w-4" />
                    Columns & Filters
                </Button>
              </div>
              <Tabs defaultValue="all" className="w-fit">
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger
                    value="all"
                    className="bg-violet-600 text-white data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="in-approval">In Approval</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <InvoiceTable />
          </div>
        </main>
      </div>
    </div>
  )
}
