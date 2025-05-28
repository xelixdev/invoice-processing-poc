import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActivePage = "dashboard" | "invoices" | "purchase-orders" | "goods-received"

interface MainHeaderProps {
  activePage: ActivePage
}

export default function MainHeader({ activePage }: MainHeaderProps) {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 gap-6">
        <nav className="flex items-center space-x-1 lg:space-x-2">
          <Link 
            href="#" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "dashboard" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Dashboard
          </Link>
          <Link 
            href="/" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "invoices" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Invoices
          </Link>
          <Link 
            href="/purchase-orders" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "purchase-orders" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Purchase Orders
          </Link>
          <Link 
            href="/goods-received" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "goods-received" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Goods Receipt Notes
          </Link>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </Button>
        </div>
      </div>
    </header>
  )
} 