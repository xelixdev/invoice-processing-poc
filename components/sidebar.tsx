import Link from "next/link"
import { ArrowLeft, ArrowRight, FileText, BarChart3, Settings } from "lucide-react"

export default function Sidebar() {
  return (
    <div className="w-16 flex flex-col bg-[#0f0629] text-white">
      <div className="h-16 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center">
          <div className="w-8 h-8 text-white flex items-center justify-center font-bold text-xl">
            X
          </div>
        </Link>
      </div>
      <nav className="flex-1 flex flex-col items-center py-4 gap-6">
        {/* Arrows icon (bidirectional arrows in purple box) */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-700">
          <div className="flex flex-col gap-0">
            <ArrowLeft className="h-4 w-4 text-white -mb-1" />
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </Link>
        
        {/* Document with checkmark icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <div className="relative flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
        </Link>
        
        {/* Contact/ID card icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <div className="relative w-5 h-5">
            <div className="w-5 h-5 border-2 border-white rounded-md flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white absolute top-1 left-[7px]" />
              <div className="w-3 h-[1px] bg-white absolute bottom-1" />
            </div>
            <div className="absolute right-[-3px] h-full w-[1px] bg-white"></div>
          </div>
        </Link>
        
        {/* Analytics/chart icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <BarChart3 className="h-5 w-5 text-white" />
        </Link>
        
        {/* Document with lines icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <div className="relative w-5 h-5 border-2 border-white rounded-sm">
            <div className="w-2 h-[1px] bg-white absolute top-1 left-[4px]" />
            <div className="w-2 h-[1px] bg-white absolute top-2 left-[4px]" />
            <div className="w-2 h-[1px] bg-white absolute top-3 left-[4px]" />
          </div>
        </Link>
        
        {/* Setting gear at the bottom */}
        <div className="mt-auto mb-6">
          <Link href="#" className="flex h-10 w-10 items-center justify-center">
            <Settings className="h-5 w-5 text-white" />
          </Link>
        </div>
      </nav>
    </div>
  )
}
