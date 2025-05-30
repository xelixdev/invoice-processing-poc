import { NextRequest, NextResponse } from 'next/server';

// Ensure we're using the full URL with protocol
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log(`Attempting to connect to Python API at: ${PYTHON_API_URL}/extract-invoice`);
    
    // Forward the request to the Python FastAPI server
    const formData = await request.formData();
    console.log(`Request form data keys: ${Array.from(formData.keys()).join(', ')}`);
    
    const response = await fetch(`${PYTHON_API_URL}/extract-invoice`, {
      method: 'POST',
      body: formData,
      // Increased timeout for production AI processing
      signal: AbortSignal.timeout(30000) // 30 second timeout for AI processing
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    // Get the response data
    const data = await response.json();
    console.log('Successfully received response from Python API');
    
    // Return the response from the Python API
    return NextResponse.json(data, { status: response.status });
    
  } catch (error: any) {
    console.error('Error proxying to Python API:', error);
    
    // More detailed error reporting
    let errorMessage = 'Failed to communicate with invoice extraction service';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Could not connect to backend API server. Please try again later.';
      errorCode = 'CONNECTION_REFUSED';
    } else if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorMessage = 'Request timed out. Large files may take longer to process.';
      errorCode = 'TIMEOUT';
    } else if (error.message?.includes('status:')) {
      errorMessage = `Backend server error: ${error.message}`;
      errorCode = 'BACKEND_ERROR';
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