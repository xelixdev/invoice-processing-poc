import { NextRequest, NextResponse } from 'next/server';

// Ensure we're using the full URL with protocol
const PYTHON_API_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://invoice-processing-poc-production.up.railway.app');

export async function POST(request: NextRequest) {
  try {
    console.log(`Attempting to connect to Python API at: ${PYTHON_API_URL}/api/extract-invoice/`);
    
    // Forward the request to the Python Django server
    const formData = await request.formData();
    console.log(`Request form data keys: ${Array.from(formData.keys()).join(', ')}`);
    
    const response = await fetch(`${PYTHON_API_URL}/api/extract-invoice/`, {
      method: 'POST',
      body: formData,
      // Add a timeout to avoid hanging indefinitely
      signal: AbortSignal.timeout(10000) // 10 second timeout
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
    const data = await response.json();
    console.log('Successfully received response from Python API');
    
    // Transform the Django response to match frontend expectations
    const transformedData = {
      document_type: "invoice",
      invoices: data.extracted_invoices || []
    };
    
    console.log('Transformed data:', transformedData);
    
    // Return the transformed response
    return NextResponse.json(transformedData, { status: response.status });
    
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