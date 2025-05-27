import Link from "next/link"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowRightArrowLeft,
  faFileInvoice,
  faFile,
  faCheck,
  faAddressBook,
  faInbox,
  faChartLine,
  faGear
} from '@fortawesome/free-solid-svg-icons'

export default function Sidebar() {
  return (
    <div className="w-16 min-w-16 max-w-16 flex-shrink-0 flex flex-col bg-[linear-gradient(rgb(11,11,69)_0%,rgb(59,15,115)_52.08%,rgb(33,8,64)_100%)] text-white">
      <div className="h-16 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center">
          <img src="/xelix_logo.svg" alt="Logo" className="w-8 h-8" />
        </Link>
      </div>
      <nav className="flex-1 flex flex-col items-center py-4 gap-6">
        {/* Invoice icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-700" title="Invoice Processing">
          <FontAwesomeIcon icon={faFileInvoice} className="h-5 w-5 text-white" />
        </Link>
        
        {/* Document icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center" title="Transactions">
          <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-5 w-5 text-white" />
        </Link>
        
        {/* File check icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center" title="Statements">
          <div className="relative">
            <FontAwesomeIcon icon={faFile} className="h-5 w-5 text-white" />
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-black absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[20%]" />
          </div>
        </Link>
        
        {/* Address book icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center" title="Vendors">
          <FontAwesomeIcon icon={faAddressBook} className="h-5 w-5 text-white" />
        </Link>
        
        {/* Line chart icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center" title="Reports">
          <FontAwesomeIcon icon={faChartLine} className="h-5 w-5 text-white" />
        </Link>

        {/* Inbox icon */}
        <Link href="#" className="flex h-10 w-10 items-center justify-center" title="Helpdesk">
          <FontAwesomeIcon icon={faInbox} className="h-5 w-5 text-white" />
        </Link>
        
        {/* Setting gear at the bottom */}
        <div className="mt-auto mb-6">
          <Link href="#" className="flex h-10 w-10 items-center justify-center" title="Settings">
            <FontAwesomeIcon icon={faGear} className="h-5 w-5 text-white" />
          </Link>
        </div>
      </nav>
    </div>
  )
}
