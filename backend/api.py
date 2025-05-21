import os
import base64
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Optional, Dict, Any
import shutil
from image_processor import get_image_from_pdf
from anthropic_client import AnthropicClient
from bedrock_client import BedrockClient
import csv
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Invoice Extraction API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_invoice_from_file(file_path: str) -> Dict[str, Any]:
    """Process a file (PDF or image) and extract invoice data."""
    try:
        # Determine file type based on extension
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        
        # Read the file
        with open(file_path, 'rb') as f:
            file_bytes = f.read()
        
        # Process based on file type
        if ext == '.pdf':
            # Convert PDF to image
            image_base64 = get_image_from_pdf(file_bytes)
            if not image_base64:
                return {"error": "Failed to process PDF file"}
        elif ext in ['.jpg', '.jpeg', '.png']:
            # For image files, encode directly to base64
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        else:
            return {"error": f"Unsupported file type: {ext}"}
        
        # Choose which client to use based on environment variables
        if os.getenv('ANTHROPIC_API_KEY'):
            client = AnthropicClient()
        elif os.environ.get('AWS_DEFAULT_REGION'):  # Check if AWS credentials are available
            client = BedrockClient()
        else:
            # If no API keys are available, return a mock response for testing
            return {
                "document_type": "invoice",
                "invoices": [{
                    "number": "INV-DEMO-123",
                    "po_number": "PO-456",
                    "amount": 1250.00,
                    "tax_amount": 75.00,
                    "currency_code": "USD",
                    "date": "2024-09-01",
                    "due_date": "2024-09-30",
                    "payment_term_days": 30,
                    "vendor": "Demo Company Ltd",
                    "line_items": [
                        {
                            "description": "Professional Services",
                            "quantity": 10,
                            "unit_price": 125.00,
                            "total": 1250.00
                        }
                    ]
                }]
            }
        
        # Extract invoice data
        result = client.extract_invoice_data(image_base64)
        if result:
            return result
        else:
            return {"error": "Failed to extract invoice data"}
            
    except Exception as e:
        return {"error": f"Error processing file: {str(e)}"}

def extract_invoice_from_csv(file_path: str) -> Dict[str, Any]:
    """Parse a CSV file and extract invoice data in the expected format."""
    try:
        invoices = []
        with open(file_path, 'r', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Map CSV columns to our invoice structure
                invoice = {
                    "number": row.get("invoice_number", ""),
                    "po_number": row.get("po_number", ""),
                    "amount": float(row.get("amount", 0)),
                    "tax_amount": float(row.get("tax_amount", 0)),
                    "currency_code": row.get("currency_code", "USD"),
                    "date": row.get("date", ""),
                    "due_date": row.get("due_date", ""),
                    "payment_term_days": int(row.get("payment_term_days", 0)),
                    "vendor": row.get("vendor", ""),
                    "line_items": []
                }
                
                # Add line items if they exist in the CSV
                # This assumes your CSV has line items in some format
                # You may need to adjust this based on your CSV structure
                if "line_item_desc" in row and row["line_item_desc"]:
                    invoice["line_items"].append({
                        "description": row.get("line_item_desc", ""),
                        "quantity": float(row.get("line_item_qty", 1)),
                        "unit_price": float(row.get("line_item_price", 0)),
                        "total": float(row.get("line_item_total", 0))
                    })
                
                invoices.append(invoice)
        
        return {
            "document_type": "invoice", 
            "invoices": invoices
        }
            
    except Exception as e:
        return {"error": f"Error processing CSV file: {str(e)}"}

def cleanup_temp_file(file_path: str):
    """Remove temporary file after processing."""
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
    except Exception as e:
        print(f"Error cleaning up temp file: {e}")

@app.post("/extract-invoice")
async def extract_invoice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Extract invoice data from an uploaded file.
    
    Accepts PDF, images (JPG, PNG), or CSV files.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Get the file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    # Check if the file type is supported
    if file_extension not in ['.pdf', '.jpg', '.jpeg', '.png', '.csv']:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file type. Please upload a PDF, JPG, JPEG, PNG, or CSV file."
        )
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
        # Write the file contents to the temporary file
        shutil.copyfileobj(file.file, temp_file)
        temp_file_path = temp_file.name
    
    # Schedule cleanup of the temporary file
    background_tasks.add_task(cleanup_temp_file, temp_file_path)
    
    try:
        # Process the file based on type
        if file_extension == '.csv':
            result = extract_invoice_from_csv(temp_file_path)
        else:
            result = extract_invoice_from_file(temp_file_path)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8000))
    
    # Run the FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=port) 