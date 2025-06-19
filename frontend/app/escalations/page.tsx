'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import MainHeader from '@/components/main-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Clock, AlertTriangle, User, Eye, MessageSquare, Sparkles, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface SLARule {
  id: string
  name: string
  naturalLanguageRule: string
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority'
  status: 'Active' | 'Inactive'
  aiProcessed: boolean
  created: string
}

interface EscalatedInvoice {
  id: string
  invoiceNumber: string
  vendorName: string
  escalationReason: string
  escalationAge: string
  slaBreach: boolean
  totalAmount: string
  invoiceDate: string
  assignedTo: {
    name: string
    initials: string
    color: string
    department: string
  } | null
  lastActionTaken: string
  nextActionRequired: string
  escalationStatus: 'Pending' | 'In Progress' | 'Resolved'
  priority: 'High' | 'Medium' | 'Low'
  escalationDate: string
  slaRule: SLARule
}

// Mock SLA rules that match the ones in settings
const mockSLARules: SLARule[] = [
  {
    id: '1',
    name: 'High Value Vendor Processing',
    naturalLanguageRule: 'If an invoice from Tech Solutions Inc., Electronics Warehouse, or Furniture Depot is over $25,000 and hasn\'t been posted within 3 days, escalate it as high priority',
    priority: 'High Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  },
  {
    id: '2',
    name: 'Critical Vendor Approval Timeout',
    naturalLanguageRule: 'Escalate any invoice from critical vendors (WOODPECKER SCHOOL & OFFICE SUPPLIES, Office Supplies Co.) that\'s been stuck in approval for more than 2 days, regardless of amount',
    priority: 'Medium Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  },
  {
    id: '3',
    name: 'Standard Processing Timeout',
    naturalLanguageRule: 'If any invoice has been in processing for more than 5 days without resolution, escalate as medium priority',
    priority: 'Medium Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  }
]

// Mock escalated invoices data based on the main invoices table
const mockEscalatedInvoices: EscalatedInvoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    vendorName: 'WOODPECKER SCHOOL & OFFICE SUPPLIES',
    escalationReason: 'Critical Vendor Approval Timeout',
    escalationAge: '3 days',
    slaBreach: true,
    totalAmount: '€4,086.10',
    invoiceDate: '2024-01-15',
    assignedTo: {
      name: 'Sarah Chen',
      initials: 'SC',
      color: 'bg-violet-500',
      department: 'IT'
    },
    lastActionTaken: 'Sent for re-approval',
    nextActionRequired: 'Review Exception',
    escalationStatus: 'In Progress',
    priority: 'High',
    escalationDate: '2024-01-18',
    slaRule: mockSLARules[1]
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-045',
    vendorName: 'Tech Solutions Inc.',
    escalationReason: 'High Value Vendor Processing',
    escalationAge: '5 days',
    slaBreach: true,
    totalAmount: '$45,250.00',
    invoiceDate: '2024-01-12',
    assignedTo: {
      name: 'David Kim',
      initials: 'DK',
      color: 'bg-amber-500',
      department: 'Operations'
    },
    lastActionTaken: 'Escalated to CFO',
    nextActionRequired: 'CFO Approval Required',
    escalationStatus: 'Pending',
    priority: 'High',
    escalationDate: '2024-01-15',
    slaRule: mockSLARules[0]
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-032',
    vendorName: 'Electronics Warehouse',
    escalationReason: 'High Value Vendor Processing',
    escalationAge: '2 days',
    slaBreach: false,
    totalAmount: '$28,750.00',
    invoiceDate: '2024-01-20',
    assignedTo: {
      name: 'Anna Rodriguez',
      initials: 'AR',
      color: 'bg-green-500',
      department: 'Sales'
    },
    lastActionTaken: 'Contacted vendor for clarification',
    nextActionRequired: 'Reassign to Procurement',
    escalationStatus: 'In Progress',
    priority: 'Medium',
    escalationDate: '2024-01-22',
    slaRule: mockSLARules[0]
  }
]

export default function EscalationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedRule, setSelectedRule] = useState<SLARule | null>(null)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

  const handleRuleClick = (rule: SLARule) => {
    setSelectedRule(rule)
    setIsRuleModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Resolved':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'Medium':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'Low':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const filteredInvoices = mockEscalatedInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.escalationReason.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || invoice.escalationStatus === statusFilter
    const matchesPriority = priorityFilter === 'all' || invoice.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activePage="invoices" />
      <div className="flex-1 flex flex-col overflow-auto">
        <MainHeader activePage="escalations" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Escalations</h1>
              <p className="text-gray-600 mt-1">Manage and resolve escalated invoices requiring immediate attention</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {filteredInvoices.filter(inv => inv.slaBreach).length} SLA Breaches
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Clock className="h-3 w-3 mr-1" />
                {filteredInvoices.filter(inv => inv.priority === 'High').length} High Priority
              </Badge>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-4 items-center">
                  <div className="relative w-full max-w-xl">
                    <Search className="absolute left-2.5 top-2.5 h-5 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder="Search by invoice number, vendor, or escalation reason..." 
                      className="w-full pl-8 bg-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="High">High Priority</SelectItem>
                      <SelectItem value="Medium">Medium Priority</SelectItem>
                      <SelectItem value="Low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escalations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Escalated Invoices ({filteredInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Escalation Age</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Last Action</TableHead>
                      <TableHead>Next Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-violet-600">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.vendorName}
                        </TableCell>
                        <TableCell>
                          <button 
                            onClick={() => handleRuleClick(invoice.slaRule)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                          >
                            {invoice.escalationReason}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(invoice.priority)}>
                            {invoice.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{invoice.escalationAge}</span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {invoice.totalAmount}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {invoice.assignedTo ? (
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-medium text-gray-900">
                                {invoice.assignedTo.name}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className="text-xs w-fit bg-blue-100 text-blue-700 hover:bg-blue-100"
                              >
                                {invoice.assignedTo.department}
                              </Badge>
                            </div>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-gray-50 text-gray-500 border-gray-300"
                            >
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{invoice.lastActionTaken}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {invoice.nextActionRequired}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.escalationStatus)}>
                            {invoice.escalationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add Comment</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <User className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reassign</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredInvoices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No escalated invoices found</h3>
                  <p className="text-sm">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'All invoices are processing normally.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      {/* Rule Details Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                SLA Rule Details
              </DialogTitle>
              <p className="text-gray-600 mt-1">AI-powered escalation rule configuration</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsRuleModalOpen(false)}
              className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {selectedRule && (
            <div className="px-6 pb-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    AI Processed
                  </Badge>
                  <Badge className={
                    selectedRule.priority === 'High Priority' 
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : selectedRule.priority === 'Medium Priority'
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }>
                    {selectedRule.priority}
                  </Badge>
                  <Badge className={
                    selectedRule.status === 'Active' 
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }>
                    {selectedRule.status}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {selectedRule.name}
                </h3>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Rule Description</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">
                  {selectedRule.naturalLanguageRule}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Created Date</h4>
                  <p className="text-gray-600">
                    {new Date(selectedRule.created).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Rule Type</h4>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    AI-Powered Natural Language
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 