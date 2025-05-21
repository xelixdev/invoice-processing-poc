import Link from "next/link"
import { LayoutGrid, FileText, BarChart3, ShoppingCart, Users, Settings, Package } from "lucide-react"

export default function Sidebar() {
  return (
    <div className="w-16 flex flex-col border-r bg-white">
      <div className="h-16 flex items-center justify-center border-b">
        <Link href="/" className="flex items-center justify-center">
          <div className="w-8 h-8 bg-violet-500 text-white flex items-center justify-center rounded-md font-bold text-xl">
            X
          </div>
        </Link>
      </div>
      <nav className="flex-1 flex flex-col gap-2 p-2">
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-100">
          <FileText className="h-5 w-5 text-violet-600" />
        </Link>
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
          <Package className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
          <Users className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted mt-auto">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Link>
      </nav>
    </div>
  )
}
