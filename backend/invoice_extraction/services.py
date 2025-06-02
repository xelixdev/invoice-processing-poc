import os
import base64
import tempfile
import shutil
from typing import Dict, Any, Optional
from django.core.files.uploadedfile import UploadedFile
from django.conf import settings
from decimal import Decimal
import json
from datetime import datetime, timedelta
import time
import csv

from ai_engineering.anthropic_client import AnthropicClient
from ai_engineering.bedrock_client import BedrockClient
from ai_engineering.image_processor import get_image_from_pdf

from .models import InvoiceExtractionJob, ExtractedInvoice, ExtractedLineItem


class InvoiceExtractionService:
    """Service for processing invoice files and extracting data."""
    
    def __init__(self):
        # Set up references to the AI classes
        self.AnthropicClient = AnthropicClient
        self.BedrockClient = BedrockClient
        self.get_image_from_pdf = get_image_from_pdf
    
    def process_file(self, extraction_job) -> Dict[str, Any]:
        """Process a file and extract invoice data."""
        try:
            # Get the file path
            file_path = extraction_job.uploaded_file.path
            file_extension = f".{extraction_job.file_type}"
            
            # Process based on file type
            if file_extension == '.csv':
                result = self._extract_invoice_from_csv(file_path)
                result['ai_service_used'] = 'csv_parser'
            else:
                result = self._extract_invoice_from_file(file_path, file_extension)
            
            return result
            
        except Exception as e:
            return {"error": f"Error processing file: {str(e)}"}
    
    def _extract_invoice_from_file(self, file_path: str, file_extension: str) -> Dict[str, Any]:
        """Process a file (PDF or image) and extract invoice data."""
        try:
            # Read the file
            with open(file_path, 'rb') as f:
                file_bytes = f.read()
            
            # Process based on file type
            if file_extension == '.pdf':
                # Convert PDF to image
                image_base64 = self.get_image_from_pdf(file_bytes)
                if not image_base64:
                    return {"error": "Failed to process PDF file"}
            elif file_extension in ['.jpg', '.jpeg', '.png']:
                # For image files, encode directly to base64
                image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            else:
                return {"error": f"Unsupported file type: {file_extension}"}
            
            # Choose which client to use based on environment variables
            ai_service_used = 'mock'
            if settings.ANTHROPIC_API_KEY:
                client = self.AnthropicClient()
                ai_service_used = 'anthropic'
            elif settings.AWS_DEFAULT_REGION and settings.AWS_ACCESS_KEY_ID:
                client = self.BedrockClient()
                ai_service_used = 'bedrock'
            else:
                # If no API keys are available, return a mock response for testing
                return {
                    "document_type": "invoice",
                    "ai_service_used": "mock",
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
                result['ai_service_used'] = ai_service_used
                return result
            else:
                return {"error": "Failed to extract invoice data"}
                
        except Exception as e:
            return {"error": f"Error processing file: {str(e)}"}
    
    def _extract_invoice_from_csv(self, file_path: str) -> Dict[str, Any]:
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