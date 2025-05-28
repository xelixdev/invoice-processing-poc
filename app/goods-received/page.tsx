import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Sidebar from "@/components/sidebar"
import MainHeader from "@/components/main-header"
import GoodsReceivedTable from "@/components/goods-received-table"

export default function GoodsReceivedPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <MainHeader activePage="goods-received" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Goods Receipt Notes</h1>
            <Button className="bg-violet-600 hover:bg-violet-700 invisible">Create Invoice</Button>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-2.5 top-2.5 h-5 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search goods receipt notes..." className="w-full pl-8 bg-white" />
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
                  <TabsTrigger value="complete">Complete</TabsTrigger>
                  <TabsTrigger value="partial">Partial</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <GoodsReceivedTable />
          </div>
        </main>
      </div>
    </div>
  )
}
