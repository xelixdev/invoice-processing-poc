'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import MainHeader from '@/components/main-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Users, Clock, CheckCircle, Calendar, Pause, AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type ViewType = 'pending' | 'on-hold' | 'overdue' | 'approved-today' | 'rejected' | 'approved-month'

export default function ApprovalsPage() {
  const [activeView, setActiveView] = useState<ViewType>('pending')
  
  // Placeholder data for different views
  const pendingApprovals = [
    {
      id: '1',
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '2024-01-15',
      supplierName: 'Office Supplies Co.',
      totalAmount: 1250.00,
      dueDate: '2024-02-15',
      status: 'Pending Approval',
      spendCategory: 'Office Supplies',
      glCode: '5100',
      projectCode: 'PROJ-2024-001',
      businessUnit: 'Operations',
      department: 'Admin',
      approverName: 'John Doe'
    },
    {
      id: '2',
      invoiceNumber: 'INV-2024-002',
      invoiceDate: '2024-01-16',
      supplierName: 'Tech Solutions Ltd.',
      totalAmount: 5600.00,
      dueDate: '2024-02-16',
      status: 'Pending Approval',
      spendCategory: 'IT Equipment',
      glCode: '5200',
      projectCode: 'PROJ-2024-002',
      businessUnit: 'IT',
      department: 'Infrastructure',
      approverName: 'John Doe'
    },
    {
      id: '5',
      invoiceNumber: 'INV-2024-008',
      invoiceDate: '2024-01-20',
      supplierName: 'Professional Services Inc.',
      totalAmount: 3200.00,
      dueDate: '2024-02-20',
      status: 'Pending Approval',
      spendCategory: 'Consulting',
      glCode: '7100',
      projectCode: 'CONS-2024-003',
      businessUnit: 'Strategy',
      department: 'Business Development',
      approverName: 'John Doe'
    },
    {
      id: '6',
      invoiceNumber: 'INV-2024-009',
      invoiceDate: '2024-01-21',
      supplierName: 'Facilities Management Corp.',
      totalAmount: 890.00,
      dueDate: '2024-02-21',
      status: 'Pending Approval',
      spendCategory: 'Facilities',
      glCode: '6200',
      projectCode: 'FAC-2024-001',
      businessUnit: 'Operations',
      department: 'Facilities',
      approverName: 'John Doe'
    },
    {
      id: '7',
      invoiceNumber: 'INV-2024-010',
      invoiceDate: '2024-01-22',
      supplierName: 'Legal Advisory Partners',
      totalAmount: 7500.00,
      dueDate: '2024-02-22',
      status: 'Pending Approval',
      spendCategory: 'Legal Services',
      glCode: '8100',
      projectCode: 'LEG-2024-001',
      businessUnit: 'Legal',
      department: 'Corporate Legal',
      approverName: 'John Doe'
    }
  ]

  const approvedToday = [
    {
      id: '3',
      invoiceNumber: 'INV-2024-003',
      invoiceDate: '2024-01-14',
      supplierName: 'Marketing Agency LLC',
      totalAmount: 3200.00,
      dueDate: '2024-02-14',
      status: 'Approved',
      spendCategory: 'Marketing',
      glCode: '6100',
      projectCode: 'MKT-2024-001',
      businessUnit: 'Marketing',
      department: 'Digital',
      approverName: 'John Doe',
      approvedDate: '2024-01-20'
    },
    {
      id: '8',
      invoiceNumber: 'INV-2024-011',
      invoiceDate: '2024-01-18',
      supplierName: 'Cloud Services Provider',
      totalAmount: 1850.00,
      dueDate: '2024-02-18',
      status: 'Approved',
      spendCategory: 'Software',
      glCode: '5300',
      projectCode: 'TECH-2024-004',
      businessUnit: 'IT',
      department: 'Infrastructure',
      approverName: 'John Doe',
      approvedDate: '2024-01-20'
    },
    {
      id: '9',
      invoiceNumber: 'INV-2024-012',
      invoiceDate: '2024-01-19',
      supplierName: 'Travel Services Inc.',
      totalAmount: 945.00,
      dueDate: '2024-02-19',
      status: 'Approved',
      spendCategory: 'Travel',
      glCode: '6300',
      projectCode: 'TRV-2024-002',
      businessUnit: 'Sales',
      department: 'Business Development',
      approverName: 'John Doe',
      approvedDate: '2024-01-20'
    }
  ]

  const approvedThisMonth = [
    ...approvedToday,
    {
      id: '4',
      invoiceNumber: 'INV-2024-004',
      invoiceDate: '2024-01-10',
      supplierName: 'Consulting Partners',
      totalAmount: 8500.00,
      dueDate: '2024-02-10',
      status: 'Approved',
      spendCategory: 'Consulting',
      glCode: '7100',
      projectCode: 'CONS-2024-001',
      businessUnit: 'Operations',
      department: 'Strategy',
      approverName: 'John Doe',
      approvedDate: '2024-01-18'
    },
    {
      id: '10',
      invoiceNumber: 'INV-2024-005',
      invoiceDate: '2024-01-08',
      supplierName: 'Equipment Rental Co.',
      totalAmount: 2400.00,
      dueDate: '2024-02-08',
      status: 'Approved',
      spendCategory: 'Equipment',
      glCode: '5400',
      projectCode: 'EQP-2024-001',
      businessUnit: 'Operations',
      department: 'Production',
      approverName: 'John Doe',
      approvedDate: '2024-01-15'
    },
    {
      id: '11',
      invoiceNumber: 'INV-2024-006',
      invoiceDate: '2024-01-05',
      supplierName: 'Training Solutions Ltd.',
      totalAmount: 1675.00,
      dueDate: '2024-02-05',
      status: 'Approved',
      spendCategory: 'Training',
      glCode: '6400',
      projectCode: 'TRN-2024-001',
      businessUnit: 'HR',
      department: 'Learning & Development',
      approverName: 'John Doe',
      approvedDate: '2024-01-12'
    },
    {
      id: '12',
      invoiceNumber: 'INV-2024-007',
      invoiceDate: '2024-01-03',
      supplierName: 'Security Services Corp.',
      totalAmount: 3850.00,
      dueDate: '2024-02-03',
      status: 'Approved',
      spendCategory: 'Security',
      glCode: '6500',
      projectCode: 'SEC-2024-001',
      businessUnit: 'Operations',
      department: 'Security',
      approverName: 'John Doe',
      approvedDate: '2024-01-10'
    }
  ]

  const onHoldApprovals = [
    {
      id: '13',
      invoiceNumber: 'INV-2024-013',
      invoiceDate: '2024-01-17',
      supplierName: 'New Vendor Solutions',
      totalAmount: 4200.00,
      dueDate: '2024-02-17',
      status: 'On Hold',
      spendCategory: 'Professional Services',
      glCode: '7200',
      projectCode: 'PROF-2024-001',
      businessUnit: 'Operations',
      department: 'Procurement',
      approverName: 'John Doe',
      holdReason: 'Awaiting vendor verification documents'
    },
    {
      id: '14',
      invoiceNumber: 'INV-2024-014',
      invoiceDate: '2024-01-19',
      supplierName: 'Budget Query Corp.',
      totalAmount: 12500.00,
      dueDate: '2024-02-19',
      status: 'On Hold',
      spendCategory: 'Consulting',
      glCode: '7100',
      projectCode: 'CONS-2024-004',
      businessUnit: 'Finance',
      department: 'Strategic Planning',
      approverName: 'John Doe',
      holdReason: 'Budget allocation confirmation needed'
    }
  ]

  const overdueApprovals = [
    {
      id: '15',
      invoiceNumber: 'INV-2024-015',
      invoiceDate: '2024-01-12',
      supplierName: 'Urgent Services Ltd.',
      totalAmount: 2800.00,
      dueDate: '2024-01-25',
      status: 'Overdue',
      spendCategory: 'Emergency Services',
      glCode: '6600',
      projectCode: 'EMRG-2024-001',
      businessUnit: 'Operations',
      department: 'Facilities',
      approverName: 'John Doe',
      daysPastDue: 3
    },
    {
      id: '16',
      invoiceNumber: 'INV-2024-016',
      invoiceDate: '2024-01-10',
      supplierName: 'Critical Systems Inc.',
      totalAmount: 9200.00,
      dueDate: '2024-01-23',
      status: 'Overdue',
      spendCategory: 'IT Services',
      glCode: '5200',
      projectCode: 'IT-2024-005',
      businessUnit: 'IT',
      department: 'Infrastructure',
      approverName: 'John Doe',
      daysPastDue: 5
    }
  ]

  const rejectedApprovals = [
    {
      id: '17',
      invoiceNumber: 'INV-2024-017',
      invoiceDate: '2024-01-16',
      supplierName: 'Incorrect Details Co.',
      totalAmount: 1500.00,
      dueDate: '2024-02-16',
      status: 'Rejected',
      spendCategory: 'Office Supplies',
      glCode: '5100',
      projectCode: 'OFF-2024-002',
      businessUnit: 'Operations',
      department: 'Admin',
      approverName: 'John Doe',
      rejectedDate: '2024-01-19',
      rejectionReason: 'Invoice amount does not match PO'
    }
  ]

  const getApprovalsList = () => {
    switch (activeView) {
      case 'pending':
        return pendingApprovals
      case 'on-hold':
        return onHoldApprovals
      case 'overdue':
        return overdueApprovals
      case 'approved-today':
        return approvedToday
      case 'rejected':
        return rejectedApprovals
      case 'approved-month':
        return approvedThisMonth
      default:
        return pendingApprovals
    }
  }

  const getViewTitle = () => {
    switch (activeView) {
      case 'pending':
        return 'Pending Approvals'
      case 'on-hold':
        return 'On Hold'
      case 'overdue':
        return 'Overdue Approvals'
      case 'approved-today':
        return 'Approved Today'
      case 'rejected':
        return 'Rejected Invoices'
      case 'approved-month':
        return 'Approved This Month'
      default:
        return 'Pending Approvals'
    }
  }

  const getViewDescription = () => {
    switch (activeView) {
      case 'pending':
        return 'Invoices awaiting your approval'
      case 'on-hold':
        return 'Invoices temporarily on hold awaiting additional information'
      case 'overdue':
        return 'Urgent invoices that require immediate attention'
      case 'approved-today':
        return 'Invoices you approved today'
      case 'rejected':
        return 'Invoices that were rejected and need rework'
      case 'approved-month':
        return 'All invoices approved this month'
      default:
        return 'Invoices awaiting your approval'
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <MainHeader activePage="approvals" />
        
        <main className="flex-1 overflow-auto bg-gray-50/50">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
            </div>

            {/* Priority Action Cards - Compact */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'pending' 
                    ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow shadow-purple-300/50' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('pending')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Pending Approval</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{pendingApprovals.length}</p>
                    </div>
                    <div className={`p-2 rounded-full ${
                      activeView === 'pending' ? 'bg-gradient-to-br from-purple-400 to-purple-500' : 'bg-purple-100'
                    }`}>
                      <Clock className={`h-5 w-5 ${
                        activeView === 'pending' ? 'text-white' : 'text-purple-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'overdue' 
                    ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 shadow shadow-red-300/50' 
                    : 'border-gray-200 hover:border-red-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('overdue')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Overdue</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{overdueApprovals.length}</p>
                    </div>
                    <div className={`p-2 rounded-full ${
                      activeView === 'overdue' ? 'bg-gradient-to-br from-red-400 to-red-500' : 'bg-red-100'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        activeView === 'overdue' ? 'text-white' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all duration-200 border ${
                  activeView === 'on-hold' 
                    ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow shadow-orange-300/50' 
                    : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
                }`}
                onClick={() => setActiveView('on-hold')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">On Hold</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{onHoldApprovals.length}</p>
                    </div>
                    <div className={`p-2 rounded-full ${
                      activeView === 'on-hold' ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-orange-100'
                    }`}>
                      <Pause className={`h-5 w-5 ${
                        activeView === 'on-hold' ? 'text-white' : 'text-orange-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Horizontal Summary Bar */}
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 mb-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                      activeView === 'approved-today' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
                    }`}
                    onClick={() => setActiveView('approved-today')}
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{approvedToday.length} Today</span>
                  </div>

                  <div 
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                      activeView === 'rejected' 
                        ? 'bg-gray-100 text-gray-800 border-gray-300' 
                        : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm'
                    }`}
                    onClick={() => setActiveView('rejected')}
                  >
                    <X className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">{rejectedApprovals.length} Rejected</span>
                  </div>

                  <div 
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all border ${
                      activeView === 'approved-month' 
                        ? 'bg-blue-100 text-blue-800 border-blue-200' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                    onClick={() => setActiveView('approved-month')}
                  >
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">{approvedThisMonth.length} This Month</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-violet-100/70 to-purple-100/70 rounded-full cursor-help">
                          <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                          <span className="text-sm font-medium text-violet-800">
                            {Math.round((approvedThisMonth.length / (pendingApprovals.length + approvedThisMonth.length + onHoldApprovals.length + overdueApprovals.length + rejectedApprovals.length)) * 100)}% Rate
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Approval rate: Percentage of invoices approved out of all processed invoices this month 
                          ({approvedThisMonth.length} approved out of {pendingApprovals.length + approvedThisMonth.length + onHoldApprovals.length + overdueApprovals.length + rejectedApprovals.length} total)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="text-xs text-gray-500">
                    Updated just now
                  </div>
                </div>
              </div>
            </div>

            {/* Approvals Table */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{getViewTitle()}</CardTitle>
                <CardDescription className="-mt-1">
                  {getViewDescription()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Spend Category</TableHead>
                      <TableHead>GL Code</TableHead>
                      <TableHead>Department</TableHead>
                      {(activeView === 'approved-today' || activeView === 'approved-month') && <TableHead>Approved Date</TableHead>}
                      {activeView === 'rejected' && <TableHead>Rejected Date</TableHead>}
                      {activeView === 'on-hold' && <TableHead>Hold Reason</TableHead>}
                      {activeView === 'overdue' && <TableHead>Days Overdue</TableHead>}
                      {activeView === 'pending' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getApprovalsList().map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">
                          <a href="#" className="text-blue-600 hover:underline">
                            {approval.invoiceNumber}
                          </a>
                        </TableCell>
                        <TableCell>{approval.invoiceDate}</TableCell>
                        <TableCell>{approval.supplierName}</TableCell>
                        <TableCell>${approval.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>{approval.dueDate}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={
                              approval.status === 'Pending Approval' 
                                ? "bg-yellow-100 text-yellow-800" 
                                : approval.status === 'Approved'
                                ? "bg-green-100 text-green-800"
                                : approval.status === 'On Hold'
                                ? "bg-orange-100 text-orange-800"
                                : approval.status === 'Overdue'
                                ? "bg-red-100 text-red-800"
                                : approval.status === 'Rejected'
                                ? "bg-gray-100 text-gray-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{approval.spendCategory}</TableCell>
                        <TableCell>{approval.glCode}</TableCell>
                        <TableCell>{approval.department}</TableCell>
                        {(activeView === 'approved-today' || activeView === 'approved-month') && <TableCell>{(approval as any).approvedDate}</TableCell>}
                        {activeView === 'rejected' && <TableCell>{(approval as any).rejectedDate}</TableCell>}
                        {activeView === 'on-hold' && <TableCell className="text-sm text-gray-600">{(approval as any).holdReason}</TableCell>}
                        {activeView === 'overdue' && <TableCell><Badge variant="destructive" className="bg-red-500">{(approval as any).daysPastDue} days</Badge></TableCell>}
                        {activeView === 'pending' && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Reassign"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}