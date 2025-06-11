import os
import base64
import tempfile
import shutil
from typing import Dict, Any, Optional, List, Tuple
from django.core.files.uploadedfile import UploadedFile
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
import json
from datetime import datetime, timedelta
import time
import csv

from ai_engineering.anthropic_client import AnthropicClient
from ai_engineering.bedrock_client import BedrockClient
from ai_engineering.image_processor import get_image_from_pdf
from ai_engineering.document_matching import find_best_match, calculate_match_confidence
from ai_engineering.data_comparison import perform_comprehensive_comparison
from purchase_orders.models import PurchaseOrder

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
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                # Try to detect the delimiter
                sample = csvfile.read(1024)
                csvfile.seek(0)
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                
                # Group rows by invoice number to handle multiple line items per invoice
                invoices_dict = {}
                
                for row in reader:
                    # Clean up column names (remove extra spaces, convert to lowercase)
                    clean_row = {k.strip().lower(): v.strip() if v else '' for k, v in row.items()}
                    
                    # Try different common column name variations
                    invoice_num = (clean_row.get('invoice_number') or 
                                 clean_row.get('invoice_num') or 
                                 clean_row.get('invoice') or 
                                 clean_row.get('inv_number') or f"CSV-INV-{len(invoices_dict) + 1}")
                    
                    if invoice_num not in invoices_dict:
                        invoices_dict[invoice_num] = {
                            "invoice_number": invoice_num,
                            "po_number": (clean_row.get('po_number') or 
                                        clean_row.get('po_num') or 
                                        clean_row.get('purchase_order') or ''),
                            "amount": self._safe_float(clean_row.get('amount') or 
                                                     clean_row.get('total') or 
                                                     clean_row.get('total_amount')),
                            "tax_amount": self._safe_float(clean_row.get('tax_amount') or 
                                                         clean_row.get('tax') or 
                                                         clean_row.get('vat')),
                            "currency_code": (clean_row.get('currency_code') or 
                                            clean_row.get('currency') or 'USD'),
                            "date": (clean_row.get('date') or 
                                   clean_row.get('invoice_date') or ''),
                            "due_date": (clean_row.get('due_date') or 
                                       clean_row.get('payment_due') or ''),
                            "payment_term_days": (clean_row.get('payment_term_days') or 
                                                clean_row.get('payment_terms') or ''),
                            "vendor": (clean_row.get('vendor') or 
                                     clean_row.get('vendor_name') or 
                                     clean_row.get('supplier') or ''),
                            "billing_address": (clean_row.get('billing_address') or 
                                              clean_row.get('address') or ''),
                            "payment_method": (clean_row.get('payment_method') or ''),
                            "line_items": []
                        }
                    
                    # Add line item if description exists
                    description = (clean_row.get('description') or 
                                 clean_row.get('item_description') or 
                                 clean_row.get('line_item_desc') or 
                                 clean_row.get('product'))
                    
                    if description:
                        line_item = {
                            "description": description,
                            "quantity": self._safe_float(clean_row.get('quantity') or 
                                                       clean_row.get('qty') or 
                                                       clean_row.get('line_item_qty') or 1),
                            "unit_price": self._safe_float(clean_row.get('unit_price') or 
                                                         clean_row.get('price') or 
                                                         clean_row.get('line_item_price')),
                            "total": self._safe_float(clean_row.get('line_total') or 
                                                    clean_row.get('line_item_total'))
                        }
                        
                        # Calculate total if not provided
                        if not line_item["total"] and line_item["quantity"] and line_item["unit_price"]:
                            line_item["total"] = line_item["quantity"] * line_item["unit_price"]
                        
                        invoices_dict[invoice_num]["line_items"].append(line_item)
                
                # Convert dictionary to list
                invoices = list(invoices_dict.values())
                
                # If no invoices found, create a basic structure
                if not invoices:
                    raise Exception("No valid invoice data found in CSV file")
            
            return {
                "document_type": "invoice",
                "invoices": invoices
            }
                
        except Exception as e:
            return {"error": f"Error processing CSV file: {str(e)}"}
    
    def _safe_float(self, value):
        """Safely convert a value to float, handling various formats."""
        if not value:
            return 0.0
        
        try:
            # Remove common currency symbols and whitespace
            clean_value = str(value).replace('$', '').replace(',', '').replace('€', '').replace('£', '').strip()
            return float(clean_value) if clean_value else 0.0
        except (ValueError, TypeError):
            return 0.0

    def extract_invoice_data(self, job: InvoiceExtractionJob) -> Dict[str, Any]:
        """
        Extract invoice data from uploaded file.
        
        Args:
            job: InvoiceExtractionJob instance
            
        Returns:
            Dict containing extraction results in frontend-compatible format
            
        Raises:
            Exception: If extraction fails
        """
        try:
            # Record start time
            start_time = time.time()
            
            # Process the file based on type
            if job.file_type == 'pdf':
                extracted_data = self._extract_from_pdf(job)
            elif job.file_type == 'csv':
                extracted_data = self._extract_from_csv(job)
            elif job.file_type in ['jpg', 'jpeg', 'png']:
                extracted_data = self._extract_from_image(job)
            else:
                raise ValueError(f"Unsupported file type: {job.file_type}")
            
            # Record processing time
            job.processing_time_seconds = time.time() - start_time
            job.processed_at = timezone.now()
            
            # Create ExtractedInvoice model instances
            result = self._create_extracted_invoices(job, extracted_data)
            
            # Convert to frontend-compatible format
            extracted_invoices = []
            for invoice_result in result['extracted_invoices']:
                extracted_invoice = invoice_result['extracted_invoice']
                
                # Build invoice data in the format frontend expects
                invoice_data = {
                    'invoice_number': extracted_invoice.invoice_number,
                    'po_number': extracted_invoice.po_number,
                    'amount': float(extracted_invoice.amount) if extracted_invoice.amount else 0,
                    'subtotal': float(extracted_invoice.amount - extracted_invoice.tax_amount) if extracted_invoice.amount and extracted_invoice.tax_amount else None,
                    'tax_amount': float(extracted_invoice.tax_amount) if extracted_invoice.tax_amount else 0,
                    'currency_code': extracted_invoice.currency_code,
                    'date': extracted_invoice.date,
                    'due_date': extracted_invoice.due_date,
                    'payment_term_days': extracted_invoice.payment_term_days,
                    'vendor': extracted_invoice.vendor,
                    'billing_address': extracted_invoice.billing_address,
                    'payment_method': extracted_invoice.payment_method,
                    'line_items': []
                }
                
                # Add line items
                for line_item in extracted_invoice.line_items.all():
                    invoice_data['line_items'].append({
                        'description': line_item.description,
                        'quantity': float(line_item.quantity) if line_item.quantity else 0,
                        'unit_price': float(line_item.unit_price) if line_item.unit_price else 0,
                        'total': float(line_item.total) if line_item.total else 0
                    })
                
                extracted_invoices.append(invoice_data)
            
            return {
                'document_type': 'invoice',
                'extracted_invoices': extracted_invoices
            }
                
        except Exception as e:
            job.status = 'FAILED'
            job.error_message = str(e)
            job.save()
            raise e

    def _extract_from_pdf(self, job: InvoiceExtractionJob) -> Dict[str, Any]:
        """Extract data from PDF file."""
        file_path = job.uploaded_file.path
        
        try:
            # Read the PDF file
            with open(file_path, 'rb') as f:
                file_bytes = f.read()
            
            # Convert PDF to image for AI processing
            image_base64 = self.get_image_from_pdf(file_bytes)
            if not image_base64:
                raise Exception("Failed to process PDF file - could not convert to image")
            
            # Try to use available AI services
            if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
                client = self.AnthropicClient()
                result = client.extract_invoice_data(image_base64)
                job.ai_service_used = 'anthropic'
                if result:
                    return result
            
            elif (hasattr(settings, 'AWS_DEFAULT_REGION') and settings.AWS_DEFAULT_REGION and 
                  hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID):
                client = self.BedrockClient()
                result = client.extract_invoice_data(image_base64)
                job.ai_service_used = 'bedrock'
                if result:
                    return result
            
            # If no AI services available, return an error
            raise Exception("No AI extraction services configured. Please configure ANTHROPIC_API_KEY or AWS credentials.")
            
        except Exception as e:
            job.ai_service_used = 'extraction_failed'
            raise Exception(f"PDF extraction failed: {str(e)}")

    def _extract_from_csv(self, job: InvoiceExtractionJob) -> Dict[str, Any]:
        """Extract data from CSV file."""
        file_path = job.uploaded_file.path
        job.ai_service_used = 'csv_parser'
        
        try:
            invoices = []
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                # Try to detect the delimiter
                sample = csvfile.read(1024)
                csvfile.seek(0)
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                
                # Group rows by invoice number to handle multiple line items per invoice
                invoices_dict = {}
                
                for row in reader:
                    # Clean up column names (remove extra spaces, convert to lowercase)
                    clean_row = {k.strip().lower(): v.strip() if v else '' for k, v in row.items()}
                    
                    # Try different common column name variations
                    invoice_num = (clean_row.get('invoice_number') or 
                                 clean_row.get('invoice_num') or 
                                 clean_row.get('invoice') or 
                                 clean_row.get('inv_number') or f"CSV-INV-{len(invoices_dict) + 1}")
                    
                    if invoice_num not in invoices_dict:
                        invoices_dict[invoice_num] = {
                            "invoice_number": invoice_num,
                            "po_number": (clean_row.get('po_number') or 
                                        clean_row.get('po_num') or 
                                        clean_row.get('purchase_order') or ''),
                            "amount": self._safe_float(clean_row.get('amount') or 
                                                     clean_row.get('total') or 
                                                     clean_row.get('total_amount')),
                            "tax_amount": self._safe_float(clean_row.get('tax_amount') or 
                                                         clean_row.get('tax') or 
                                                         clean_row.get('vat')),
                            "currency_code": (clean_row.get('currency_code') or 
                                            clean_row.get('currency') or 'USD'),
                            "date": (clean_row.get('date') or 
                                   clean_row.get('invoice_date') or ''),
                            "due_date": (clean_row.get('due_date') or 
                                       clean_row.get('payment_due') or ''),
                            "payment_term_days": (clean_row.get('payment_term_days') or 
                                                clean_row.get('payment_terms') or ''),
                            "vendor": (clean_row.get('vendor') or 
                                     clean_row.get('vendor_name') or 
                                     clean_row.get('supplier') or ''),
                            "billing_address": (clean_row.get('billing_address') or 
                                              clean_row.get('address') or ''),
                            "payment_method": (clean_row.get('payment_method') or ''),
                            "line_items": []
                        }
                    
                    # Add line item if description exists
                    description = (clean_row.get('description') or 
                                 clean_row.get('item_description') or 
                                 clean_row.get('line_item_desc') or 
                                 clean_row.get('product'))
                    
                    if description:
                        line_item = {
                            "description": description,
                            "quantity": self._safe_float(clean_row.get('quantity') or 
                                                       clean_row.get('qty') or 
                                                       clean_row.get('line_item_qty') or 1),
                            "unit_price": self._safe_float(clean_row.get('unit_price') or 
                                                         clean_row.get('price') or 
                                                         clean_row.get('line_item_price')),
                            "total": self._safe_float(clean_row.get('line_total') or 
                                                    clean_row.get('line_item_total'))
                        }
                        
                        # Calculate total if not provided
                        if not line_item["total"] and line_item["quantity"] and line_item["unit_price"]:
                            line_item["total"] = line_item["quantity"] * line_item["unit_price"]
                        
                        invoices_dict[invoice_num]["line_items"].append(line_item)
                
                # Convert dictionary to list
                invoices = list(invoices_dict.values())
                
                # If no invoices found, create a basic structure
                if not invoices:
                    raise Exception("No valid invoice data found in CSV file")
            
            return {
                "document_type": "invoice",
                "invoices": invoices
            }
                
        except Exception as e:
            job.ai_service_used = 'csv_parse_failed'
            raise Exception(f"CSV parsing failed: {str(e)}")

    def _extract_from_image(self, job: InvoiceExtractionJob) -> Dict[str, Any]:
        """Extract data from image file."""
        file_path = job.uploaded_file.path
        
        try:
            # Read the image file and encode to base64
            with open(file_path, 'rb') as f:
                file_bytes = f.read()
            
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            
            # Try to use available AI services
            if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
                client = self.AnthropicClient()
                result = client.extract_invoice_data(image_base64)
                job.ai_service_used = 'anthropic'
                if result:
                    return result
            
            elif (hasattr(settings, 'AWS_DEFAULT_REGION') and settings.AWS_DEFAULT_REGION and 
                  hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID):
                client = self.BedrockClient()
                result = client.extract_invoice_data(image_base64)
                job.ai_service_used = 'bedrock'
                if result:
                    return result
            
            # If no AI services available, return an error
            raise Exception("No AI extraction services configured. Please configure ANTHROPIC_API_KEY or AWS credentials.")
            
        except Exception as e:
            job.ai_service_used = 'extraction_failed'
            raise Exception(f"Image extraction failed: {str(e)}")

    def _create_extracted_invoices(self, job: InvoiceExtractionJob, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create ExtractedInvoice model instances from extracted data."""
        extracted_invoices = []
        
        for invoice_data in extracted_data['invoices']:
            # Create the extracted invoice without line_items_data
            extracted_invoice = ExtractedInvoice.objects.create(
                extraction_job=job,
                invoice_number=invoice_data.get('number'),
                po_number=invoice_data.get('po_number', ''),
                amount=invoice_data.get('amount'),
                tax_amount=invoice_data.get('tax_amount'),
                currency_code=invoice_data.get('currency_code', 'USD'),
                date=invoice_data.get('date'),
                due_date=invoice_data.get('due_date'),
                payment_term_days=invoice_data.get('payment_term_days'),
                vendor=invoice_data.get('vendor'),
                billing_address=invoice_data.get('billing_address'),
                payment_method=invoice_data.get('payment_method')
            )
            
            # Create line items separately
            line_items_data = invoice_data.get('line_items', [])
            for line_item_data in line_items_data:
                ExtractedLineItem.objects.create(
                    extracted_invoice=extracted_invoice,
                    description=line_item_data.get('description'),
                    quantity=line_item_data.get('quantity'),
                    unit_price=line_item_data.get('unit_price'),
                    total=line_item_data.get('total')
                )
            
            extracted_invoices.append({
                'extracted_invoice': extracted_invoice,
                'original_data': invoice_data
            })
        
        job.status = 'COMPLETED'
        job.save()
        
        return {
            'job': job,
            'extracted_invoices': extracted_invoices
        }


class POMatchingService:
    """Service class for handling purchase order matching operations."""
    
    def __init__(self):
        self._cached_po_numbers = None
    
    def find_matching_pos(self, extracted_invoices: List[Dict[str, Any]], match_threshold: int = 2) -> List[Dict[str, Any]]:
        """
        Find matching purchase orders for a list of extracted invoices.
        
        Args:
            extracted_invoices: List of extracted invoice data
            match_threshold: Maximum edit distance for fuzzy matching
            
        Returns:
            List of matching results
        """
        # Cache PO numbers for efficiency
        if self._cached_po_numbers is None:
            self._cached_po_numbers = list(PurchaseOrder.objects.values_list('po_number', flat=True))
        
        matching_results = []
        
        for invoice_data in extracted_invoices:
            extracted_invoice = invoice_data['extracted_invoice']
            matching_result = self._find_single_po_match(extracted_invoice, match_threshold)
            matching_results.append(matching_result)
        
        return matching_results
    
    def _find_single_po_match(self, extracted_invoice: ExtractedInvoice, match_threshold: int) -> Dict[str, Any]:
        """
        Find a matching PO for a single extracted invoice.
        
        Args:
            extracted_invoice: ExtractedInvoice instance
            match_threshold: Maximum edit distance for fuzzy matching
            
        Returns:
            Dict containing match results
        """
        extracted_po_number = extracted_invoice.po_number.strip() if extracted_invoice.po_number else ""
        
        result = {
            'extracted_invoice': extracted_invoice,
            'extracted_po_number': extracted_po_number,
            'matched_po': None,
            'match_confidence': 0,
            'match_type': 'none'
        }
        
        if not extracted_po_number or not self._cached_po_numbers:
            return result
        
        # Find best match using document matching service
        match_result = find_best_match(extracted_po_number, self._cached_po_numbers, match_threshold)
        
        if match_result:
            matched_po_number, match_type_result = match_result
            matched_po = PurchaseOrder.objects.select_related('vendor', 'company').get(po_number=matched_po_number)
            
            # Calculate confidence score
            match_confidence = calculate_match_confidence(
                extracted_po_number, 
                matched_po_number, 
                match_type_result
            )
            
            result.update({
                'matched_po': matched_po,
                'match_confidence': match_confidence,
                'match_type': 'exact' if match_type_result == 'exact' else 'fuzzy'
            })
        
        return result


class DataComparisonService:
    """Service class for handling data comparison between invoices and POs."""
    
    def compare_invoice_to_po(self, extracted_invoice: ExtractedInvoice, matched_po: PurchaseOrder, original_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare extracted invoice data against matched PO data.
        
        Args:
            extracted_invoice: ExtractedInvoice instance
            matched_po: Matched PurchaseOrder instance
            original_data: Original extracted data dictionary
            
        Returns:
            Dict containing comparison results
        """
        try:
            invoice_data = self._prepare_invoice_data(extracted_invoice, original_data)
            po_data = self._prepare_po_data(matched_po)
            
            comparison_result = perform_comprehensive_comparison(invoice_data, po_data)
            
            # Convert MatchResult enums to strings for serialization
            comparison_result['overall_status'] = comparison_result['overall_status'].value
            for field_key, field_comparison in comparison_result['comparisons'].items():
                field_comparison['result'] = field_comparison['result'].value
            
            return comparison_result
            
        except Exception as e:
            # Return fallback result if comparison fails
            return {
                'overall_status': 'escalation_required',
                'comparisons': {
                    'error': {
                        'result': 'escalation_required',
                        'details': {
                            'reason': f'Data comparison failed: {str(e)}',
                            'error': str(e)
                        }
                    }
                }
            }
    
    def _prepare_invoice_data(self, extracted_invoice: ExtractedInvoice, original_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare extracted invoice data for comparison.
        
        Args:
            extracted_invoice: ExtractedInvoice model instance
            original_data: Original extracted data dictionary
            
        Returns:
            Dict formatted for comparison
        """
        return {
            'amount': float(extracted_invoice.amount) if extracted_invoice.amount else None,
            'currency_code': extracted_invoice.currency_code,
            'payment_term_days': int(extracted_invoice.payment_term_days) if extracted_invoice.payment_term_days else None,
            'vendor': extracted_invoice.vendor
        }
    
    def _prepare_po_data(self, matched_po: PurchaseOrder) -> Dict[str, Any]:
        """
        Prepare matched PO data for comparison.
        
        Args:
            matched_po: PurchaseOrder model instance
            
        Returns:
            Dict formatted for comparison
        """
        # Extract payment term days from payment_terms string
        payment_term_days = None
        if matched_po.payment_terms:
            # Try to extract numeric days from common payment terms formats
            import re
            # Match patterns like "Net 7", "Net 30", "7", "30 days", etc.
            match = re.search(r'\b(\d+)\b', matched_po.payment_terms)
            if match:
                payment_term_days = int(match.group(1))
        
        return {
            'total_amount': float(matched_po.total_amount),
            'currency': matched_po.currency,
            'payment_term_days': payment_term_days,
            'vendor_name': matched_po.vendor.name
        }


class ExtractAndMatchOrchestrator:
    """
    Orchestrator service that coordinates the complete extract-and-match workflow.
    
    This follows the single responsibility principle by delegating to specialized services:
    - InvoiceExtractionService: Handles file processing and data extraction
    - POMatchingService: Handles PO matching logic
    - DataComparisonService: Handles data validation between invoice and PO
    """
    
    def __init__(self):
        self.extraction_service = InvoiceExtractionService()
        self.matching_service = POMatchingService()
        self.comparison_service = DataComparisonService()
    
    def process_uploaded_file(self, uploaded_file: UploadedFile, match_threshold: int = 2) -> Dict[str, Any]:
        """
        Process uploaded file through the complete extract-and-match workflow.
        
        Args:
            uploaded_file: Django UploadedFile instance
            match_threshold: Maximum edit distance for fuzzy matching
            
        Returns:
            Dict containing complete processing results
            
        Raises:
            Exception: If any step in the workflow fails
        """
        # Step 1: Create extraction job
        job = self._create_extraction_job(uploaded_file)
        
        try:
            # Step 2: Extract invoice data (this runs the full extraction pipeline)
            extraction_result = self.extraction_service.extract_invoice_data(job)
            
            # The extraction service now saves to models and returns frontend format
            # We need to get the actual ExtractedInvoice model instances for matching
            extracted_invoice_instances = []
            for extracted_invoice in job.extracted_invoices.all():
                extracted_invoice_instances.append({
                    'extracted_invoice': extracted_invoice,
                    'original_data': {}  # We have the model instance, so original data is not needed
                })
            
            # Step 3: Find matching POs
            matching_results = self.matching_service.find_matching_pos(extracted_invoice_instances, match_threshold)
            
            # Step 4: Perform data comparison for matched POs and build simplified response
            invoices = self._build_simplified_response(matching_results)
            
            return {
                'invoices': invoices
            }
            
        except Exception as e:
            job.status = 'FAILED'
            job.error_message = f'Workflow failed: {str(e)}'
            job.save()
            raise e
    
    def _create_extraction_job(self, uploaded_file: UploadedFile) -> InvoiceExtractionJob:
        """Create a new extraction job from uploaded file."""
        return InvoiceExtractionJob.objects.create(
            original_filename=uploaded_file.name,
            file_type=os.path.splitext(uploaded_file.name)[1].lower().replace('.', ''),
            uploaded_file=uploaded_file,
            status='PROCESSING'
        )
    
    def _build_simplified_response(self, matching_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Build a simplified response with just invoice data and matching results.
        
        Args:
            matching_results: List of PO matching results
            
        Returns:
            List of simplified invoice objects with embedded matching data
        """
        invoices = []
        
        for result in matching_results:
            extracted_invoice = result['extracted_invoice']
            
            # Build the core invoice data
            invoice_data = {
                'invoice_number': extracted_invoice.invoice_number,
                'po_number': extracted_invoice.po_number,
                'amount': float(extracted_invoice.amount) if extracted_invoice.amount else 0,
                'subtotal': float(extracted_invoice.amount - extracted_invoice.tax_amount) if extracted_invoice.amount and extracted_invoice.tax_amount else None,
                'tax_amount': float(extracted_invoice.tax_amount) if extracted_invoice.tax_amount else 0,
                'currency_code': extracted_invoice.currency_code,
                'date': extracted_invoice.date,
                'due_date': extracted_invoice.due_date,
                'payment_term_days': extracted_invoice.payment_term_days,
                'vendor': extracted_invoice.vendor,
                'billing_address': extracted_invoice.billing_address,
                'payment_method': extracted_invoice.payment_method,
                'line_items': []
            }
            
            # Add line items
            for line_item in extracted_invoice.line_items.all():
                invoice_data['line_items'].append({
                    'description': line_item.description,
                    'quantity': float(line_item.quantity) if line_item.quantity else 0,
                    'unit_price': float(line_item.unit_price) if line_item.unit_price else 0,
                    'total': float(line_item.total) if line_item.total else 0
                })
            
            # Add matching information
            matching_info = {
                'matched_po': None,
                'match_confidence': result['match_confidence'],
                'match_type': result['match_type'],
                'data_comparison': None
            }
            
            # Include matched PO data if available
            if result['matched_po']:
                matched_po = result['matched_po']
                matching_info['matched_po'] = {
                    'po_number': matched_po.po_number,
                    'vendor_name': matched_po.vendor.name,
                    'company_name': matched_po.company.name,
                    'total_amount': float(matched_po.total_amount),
                    'currency': matched_po.currency,
                    'status': matched_po.status,
                    'date': matched_po.date.isoformat() if matched_po.date else None,
                    'required_delivery_date': matched_po.required_delivery_date.isoformat() if matched_po.required_delivery_date else None
                }
                
                # Perform data comparison
                comparison_result = self.comparison_service.compare_invoice_to_po(
                    extracted_invoice,
                    matched_po,
                    {}
                )
                matching_info['data_comparison'] = comparison_result
            
            # Combine invoice data with matching info
            invoice_data['matching'] = matching_info
            invoices.append(invoice_data)
        
        return invoices
    
 