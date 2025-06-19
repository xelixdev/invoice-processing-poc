'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Send, 
  Mail, 
  User, 
  Copy, 
  Sparkles,
  FileText,
  AlertTriangle
} from 'lucide-react'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  onSend: (emailData: EmailData) => void
  invoiceData: {
    invoiceNumber: string
    vendor: string
    amount: number
    poNumber?: string
    discrepancies: string[]
  }
  vendorContact?: {
    email: string
    name: string
    phone?: string
  }
}

interface EmailData {
  to: string
  cc: string
  subject: string
  body: string
}

export default function EmailComposer({ 
  isOpen, 
  onClose, 
  onSend, 
  invoiceData, 
  vendorContact 
}: EmailComposerProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: vendorContact?.email || '',
    cc: 'ap-team@company.com',
    subject: `Invoice Inquiry - ${invoiceData.invoiceNumber} [${invoiceData.vendor}]`,
    body: generateEmailBody(invoiceData, vendorContact?.name || 'Vendor Contact')
  })

  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    setIsSending(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    onSend(emailData)
    setIsSending(false)
    onClose()
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(emailData.body)
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[590px] bg-white shadow-2xl transition-all duration-300 ease-out z-[70]" 
         style={{ 
           transform: isOpen ? 'translateX(0px)' : 'translateX(100%)',
           visibility: isOpen ? 'visible' : 'hidden'
         }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-gray-900">Contact Vendor</h2>
              <Badge variant="outline" className="ml-2 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
            {/* Invoice Context */}
            <Card className="border-amber-200 bg-amber-50/50 flex-shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Invoice Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-slate-600">Invoice:</span>
                  <span className="font-medium">{invoiceData.invoiceNumber}</span>
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-medium">${invoiceData.amount.toLocaleString()}</span>
                  {invoiceData.poNumber && (
                    <>
                      <span className="text-slate-600">PO Number:</span>
                      <span className="font-medium">{invoiceData.poNumber}</span>
                    </>
                  )}
                </div>
                {invoiceData.discrepancies.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-amber-200">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span className="font-medium text-amber-700">Discrepancies:</span>
                    </div>
                    <ul className="space-y-1 text-amber-700">
                      {invoiceData.discrepancies.map((item, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Form */}
            <div className="flex flex-col flex-1 space-y-3 min-h-0">
              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-3 flex-shrink-0">
                <div>
                  <Label htmlFor="to" className="text-xs font-medium text-slate-700">To</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <Input
                      id="to"
                      value={emailData.to}
                      onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                      className="text-sm"
                      placeholder="vendor@example.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cc" className="text-xs font-medium text-slate-700">CC</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-slate-400" />
                    <Input
                      id="cc"
                      value={emailData.cc}
                      onChange={(e) => setEmailData({...emailData, cc: e.target.value})}
                      className="text-sm"
                      placeholder="team@company.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject" className="text-xs font-medium text-slate-700">Subject</Label>
                  <Input
                    id="subject"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                    className="text-sm mt-1"
                  />
                </div>
              </div>

              {/* Message Textarea - Expandable */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="body" className="text-xs font-medium text-slate-700">Message</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCopyToClipboard}
                    className="text-xs h-6 px-2"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  id="body"
                  value={emailData.body}
                  onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                  className="text-sm flex-1 resize-none min-h-0"
                  placeholder="Email body will be generated automatically..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Email will be sent and this recommendation marked as completed
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSend}
                  disabled={isSending || !emailData.to || !emailData.subject}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <>
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 mr-1" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

// Generate AI-powered email body
function generateEmailBody(invoiceData: any, vendorName: string): string {
  const discrepancyText = invoiceData.discrepancies.length > 0 
    ? `\n\nWe've identified the following items that need clarification:\n${invoiceData.discrepancies.map(d => `• ${d}`).join('\n')}`
    : ''

  const poText = invoiceData.poNumber 
    ? `\n• Purchase Order: ${invoiceData.poNumber}`
    : ''

  return `Dear ${vendorName},

We're currently reviewing Invoice #${invoiceData.invoiceNumber} dated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} and need your assistance to complete our approval process.${discrepancyText}

Invoice details for reference:
• Invoice Number: ${invoiceData.invoiceNumber}${poText}
• Invoice Amount: $${invoiceData.amount.toLocaleString()}

Could you please provide clarification or any necessary corrections? This will help us process your payment promptly.

We appreciate your prompt response and continued partnership.

Best regards,
Accounts Payable Team
Company Name

---
This email was generated with AI assistance for faster vendor communication.`
}