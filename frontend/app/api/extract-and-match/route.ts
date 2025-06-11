import { NextRequest, NextResponse } from 'next/server';

// Define interfaces for the simplified extract-and-match response
interface ExtractedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface MatchingInfo {
  matched_po: any | null;
  match_confidence: number;
  match_type: string;
  data_comparison: any | null;
}

interface SimplifiedInvoice {
  invoice_number: string;
  po_number: string;
  amount: number;
  subtotal?: number | null;
  tax_amount: number;
  currency_code: string;
  date: string;
  due_date: string;
  payment_term_days: string;
  vendor: string;
  billing_address: string;
  payment_method: string;
  line_items: ExtractedLineItem[];
  matching: MatchingInfo;
}

interface ExtractAndMatchResponse {
  invoices: SimplifiedInvoice[];
}

// Frontend-compatible invoice interface
interface FrontendInvoice {
  invoice_number: string;
  po_number: string;
  amount: number;
  subtotal?: number | null;
  tax_amount: number;
  currency_code: string;
  date: string;
  due_date: string;
  payment_term_days: string;
  vendor: string;
  billing_address: string;
  payment_method: string;
  line_items: ExtractedLineItem[];
}

// Ensure we're using the full URL with protocol
const PYTHON_API_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app');

export async function POST(request: NextRequest) {
  try {
    console.log(`Attempting to connect to Python API at: ${PYTHON_API_URL}/api/extract-and-match/`);
    
    // Forward the request to the Python Django server (extract-and-match endpoint)
    const formData = await request.formData();
    console.log(`Request form data keys: ${Array.from(formData.keys()).join(', ')}`);
    
    const response = await fetch(`${PYTHON_API_URL}/api/extract-and-match/`, {
      method: 'POST',
      body: formData,
      // Increase timeout to 60 seconds for multi-page documents
      signal: AbortSignal.timeout(60000)
    });
    
    // Check if response is ok and log more details
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from Django API: ${errorText}`);
      throw new Error(`Django API returned ${response.status}: ${errorText}`);
    }
    
    // Get the response data
    const data = await response.json() as ExtractAndMatchResponse;
    console.log('Successfully received response from Python API');
    console.log('Full response data:', JSON.stringify(data, null, 2));
    
    // The new simplified response structure contains:
    // - invoices: [{ invoice data + matching: { matched_po, match_confidence, etc. } }]
    
    console.log('Returning simplified extract-and-match response to frontend');
    
    // Return the simplified response for frontend to handle
    return NextResponse.json(data, { status: response.status });
    
  } catch (error: any) {
    console.error('Error proxying to Python API:', error);
    
    // More detailed error reporting
    let errorMessage = 'Failed to communicate with invoice extraction service';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Could not connect to Python API server. Is it running?';
      errorCode = 'CONNECTION_REFUSED';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Connection to Python API timed out';
      errorCode = 'TIMEOUT';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        details: error.message
      },
      { status: 500 }
    );
  }
} 