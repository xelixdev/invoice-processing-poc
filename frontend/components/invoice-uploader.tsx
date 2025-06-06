"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface InvoiceData {
  document_type: string;
  invoices: Invoice[];
  error?: string;
}

interface Invoice {
  number: string;
  po_number: string;
  amount: number;
  tax_amount: number;
  currency_code: string;
  date: string;
  due_date: string;
  payment_term_days: string;
  vendor: string;
  billing_address: string;
  payment_method: string;
  line_items: LineItem[];
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function InvoiceUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    const allowedTypes = [
      "text/csv",
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, PDF, JPG, or PNG file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setInvoiceData(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-invoice", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setInvoiceData(data);
        toast({
          title: "Success",
          description: "Invoice data extracted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to extract invoice data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process the file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Invoice</CardTitle>
          <CardDescription>
            Upload a CSV, PDF, or image file to extract invoice data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="invoice-file">File</Label>
              <Input
                id="invoice-file"
                type="file"
                accept=".csv,.pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Extract Data"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {invoiceData && invoiceData.invoices && invoiceData.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Invoice Data</CardTitle>
            <CardDescription>
              Document Type: {invoiceData.document_type}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {invoiceData.invoices.map((invoice, index) => (
              <div key={index} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Invoice Number</h3>
                    <p>{invoice.number || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">PO Number</h3>
                    <p>{invoice.po_number || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Vendor</h3>
                    <p>{invoice.vendor || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Currency</h3>
                    <p>{invoice.currency_code || "USD"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Invoice Date</h3>
                    <p>{invoice.date || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Due Date</h3>
                    <p>{invoice.due_date || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Amount</h3>
                    <p>{formatCurrency(invoice.amount, invoice.currency_code)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Tax Amount</h3>
                    <p>{formatCurrency(invoice.tax_amount, invoice.currency_code)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Payment Terms</h3>
                    <p>{invoice.payment_term_days || ''}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Billing Address</h3>
                    <p>{invoice.billing_address || ''}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Payment Method</h3>
                    <p>{invoice.payment_method || ''}</p>
                  </div>
                </div>

                {invoice.line_items && invoice.line_items.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Line Items</h3>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoice.line_items.map((item, itemIndex) => (
                            <tr key={itemIndex}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {item.description}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(item.unit_price, invoice.currency_code)}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(item.total, invoice.currency_code)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {invoiceData && (!invoiceData.invoices || invoiceData.invoices.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Document type: {invoiceData.document_type}</p>
            <p>No invoice data was found in this document.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 