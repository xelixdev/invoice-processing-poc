import Link from "next/link"
import { Bell, User, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActivePage = "statements" | "invoices" | "approvals" | "vendors" | "helpdesk"

interface MainHeaderProps {
  activePage: ActivePage
  invoicesHref?: string
}

export default function MainHeader({ activePage, invoicesHref = "/" }: MainHeaderProps) {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 gap-6">
        <nav className="flex items-center space-x-1 lg:space-x-2">
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
            href="/approvals" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "approvals" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Approvals
          </Link>
          <Link 
            href="#" 
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              activePage === "vendors" 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-primary"
            } transition-colors`}
          >
            Vendors
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