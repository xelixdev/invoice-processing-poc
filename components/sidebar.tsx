import Link from "next/link"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowRightArrowLeft, 
  faFileLines, 
  faIdCard, 
  faChartBar, 
  faFileAlt, 
  faGear 
} from '@fortawesome/free-solid-svg-icons'

export default function Sidebar() {
  return (
    <div className="w-16 flex flex-col bg-[#0f0629] text-white">
      <div className="h-16 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center">
          <img src="/xelix_logo.svg" alt="Logo" className="w-8 h-8" />
        </Link>
      </div>
      <nav className="flex-1 flex flex-col items-center py-4 gap-6">
        {/* Arrows icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-700">
          <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-4 w-4 text-white" />
        </Link>
        
        {/* Document icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <FontAwesomeIcon icon={faFileLines} className="h-5 w-5 text-white" />
        </Link>
        
        {/* ID card icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <FontAwesomeIcon icon={faIdCard} className="h-5 w-5 text-white" />
        </Link>
        
        {/* Analytics/chart icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <FontAwesomeIcon icon={faChartBar} className="h-5 w-5 text-white" />
        </Link>
        
        {/* Document with lines icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center">
          <FontAwesomeIcon icon={faFileAlt} className="h-5 w-5 text-white" />
        </Link>
        
        {/* Setting gear at the bottom */}
        <div className="mt-auto mb-6">
          <Link href="#" className="flex h-10 w-10 items-center justify-center">
            <FontAwesomeIcon icon={faGear} className="h-5 w-5 text-white" />
          </Link>
        </div>
      </nav>
    </div>
  )
}
