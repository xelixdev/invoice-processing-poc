import Link from "next/link"
import { Bell, User, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActivePage = "statements" | "invoices" | "approvals" | "vendors" | "helpdesk" | "settings" | "approval-rules" | "purchase-orders" | "goods-received" | "automation"

interface MainHeaderProps {
  activePage: ActivePage
  invoicesHref?: string
  sidebarContext?: "invoices" | "settings" // Context from sidebar selection
}

export default function MainHeader({ activePage, invoicesHref = "/", sidebarContext }: MainHeaderProps) {
  // Determine context from activePage if not explicitly provided
  const context = sidebarContext || 
    (activePage === "settings" ? "settings" : "invoices")

  const renderNavigation = () => {
    if (context === "settings") {
      // Settings Context: Statements | Invoices (active, points to Approval Rules) | Helpdesk | Automation
      return (
        <>
          <Link 
            href="#" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "statements" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Statements
          </Link>
          <Link 
            href="/settings" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "approval-rules"
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Invoices
          </Link>
          <Link 
            href="#" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "helpdesk" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Helpdesk
          </Link>
          <Link 
            href="#" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "automation" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Automation
          </Link>
        </>
      )
    } else {
      // Invoice Processing Context: Dashboard | Invoices | Purchase Orders | Goods Receipts | Approvals
      return (
        <>
          <Link 
            href="#" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "statements" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Dashboard
          </Link>
          <Link 
            href={invoicesHref} 
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
            Goods Receipts
          </Link>
          <Link 
            href="/approvals" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "approvals" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Approvals
          </Link>
        </>
      )
    }
  }

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 gap-6">
        <nav className="flex items-center space-x-1 lg:space-x-2">
          {renderNavigation()}
        </nav>
        <div className="ml-auto flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
} 