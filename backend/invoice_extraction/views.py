from django.shortcuts import render
import os
import time
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from .models import InvoiceExtractionJob, ExtractedInvoice, ExtractedLineItem
from .serializers import (
    InvoiceExtractionJobSerializer, InvoiceExtractionUploadSerializer,
    ExtractedInvoiceSerializer
)
from .services import InvoiceExtractionService


class InvoiceExtractionJobViewSet(viewsets.ModelViewSet):
    """ViewSet for InvoiceExtractionJob model."""
    queryset = InvoiceExtractionJob.objects.all()
    serializer_class = InvoiceExtractionJobSerializer
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """Upload and process an invoice file."""
        serializer = InvoiceExtractionUploadSerializer(data=request.data)
        if serializer.is_valid():
            uploaded_file = serializer.validated_data['file']
            
            # Create extraction job
            job = InvoiceExtractionJob.objects.create(
                original_filename=uploaded_file.name,
                file_type=os.path.splitext(uploaded_file.name)[1].lower().replace('.', ''),
                uploaded_file=uploaded_file,
                status='PROCESSING'
            )
            
            try:
                # Process the file
                start_time = time.time()
                extraction_service = InvoiceExtractionService()
                result = extraction_service.process_file(job)
                processing_time = time.time() - start_time
                
                if result.get('error'):
                    job.status = 'FAILED'
                    job.error_message = result['error']
                else:
                    job.status = 'COMPLETED'
                    job.ai_service_used = result.get('ai_service_used', 'unknown')
                    
                    # Save extracted data
                    for invoice_data in result.get('invoices', []):
                        extracted_invoice = ExtractedInvoice.objects.create(
                            extraction_job=job,
                            document_type=result.get('document_type', 'invoice'),
                            invoice_number=invoice_data.get('number', ''),
                            po_number=invoice_data.get('po_number', ''),
                            amount=invoice_data.get('amount'),
                            tax_amount=invoice_data.get('tax_amount'),
                            currency_code=invoice_data.get('currency_code', 'USD'),
                            date=invoice_data.get('date', ''),
                            due_date=invoice_data.get('due_date', ''),
                            payment_term_days=invoice_data.get('payment_term_days'),
                            vendor=invoice_data.get('vendor', ''),
                            billing_address=invoice_data.get('billing_address', ''),
                            payment_method=invoice_data.get('payment_method', '')
                        )
                        
                        # Save line items
                        for line_item_data in invoice_data.get('line_items', []):
                            ExtractedLineItem.objects.create(
                                extracted_invoice=extracted_invoice,
                                description=line_item_data.get('description', ''),
                                quantity=line_item_data.get('quantity'),
                                unit_price=line_item_data.get('unit_price'),
                                total=line_item_data.get('total')
                            )
                
                job.processing_time_seconds = processing_time
                job.processed_at = timezone.now()
                job.save()
                
                # Return the job with extracted data
                response_serializer = InvoiceExtractionJobSerializer(job)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                job.status = 'FAILED'
                job.error_message = str(e)
                job.save()
                return Response(
                    {'error': f'Processing failed: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExtractedInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ExtractedInvoice model (read-only)."""
    queryset = ExtractedInvoice.objects.all()
    serializer_class = ExtractedInvoiceSerializer
