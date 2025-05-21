import InvoiceUploader from "@/components/invoice-uploader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice Extraction",
  description: "Extract data from your invoices using AI",
};

export default function InvoiceExtractionPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Extraction</h1>
          <p className="text-muted-foreground">
            Upload your invoices and automatically extract the key information.
          </p>
        </div>
        <InvoiceUploader />
      </div>
    </div>
  );
} 