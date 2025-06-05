from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
import uuid


class InvoiceExtractionJob(models.Model):
    """Model to track invoice extraction jobs."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)  # pdf, jpg, png, csv
    uploaded_file = models.FileField(upload_to='invoice_uploads/')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    
    # Processing details
    ai_service_used = models.CharField(max_length=50, blank=True)  # anthropic, bedrock, mock
    processing_time_seconds = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Extraction Job {self.id} - {self.original_filename}"


class ExtractedInvoice(models.Model):
    """Model to store extracted invoice data before it's processed into the main Invoice model."""
    extraction_job = models.ForeignKey(InvoiceExtractionJob, on_delete=models.CASCADE, related_name='extracted_invoices')
    
    # Raw extracted data
    document_type = models.CharField(max_length=50, default='invoice')
    invoice_number = models.CharField(max_length=100, null=True, blank=True)
    po_number = models.CharField(max_length=100, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency_code = models.CharField(max_length=3, default='USD', null=True, blank=True)
    date = models.CharField(max_length=50, null=True, blank=True)  # Store as string initially for parsing
    due_date = models.CharField(max_length=50, null=True, blank=True)
    payment_term_days = models.CharField(max_length=50, null=True, blank=True)
    vendor = models.CharField(max_length=255, null=True, blank=True)
    
    # Processing status
    processed_to_invoice = models.BooleanField(default=False)
    processed_invoice_id = models.IntegerField(null=True, blank=True)  # Reference to main Invoice model
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Extracted Invoice {self.invoice_number or 'No Number'} from {self.extraction_job.original_filename}"


class ExtractedLineItem(models.Model):
    """Model to store extracted line item data."""
    extracted_invoice = models.ForeignKey(ExtractedInvoice, on_delete=models.CASCADE, related_name='line_items')
    
    description = models.CharField(max_length=500, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Line Item: {self.description or 'No Description'} ({self.extracted_invoice.invoice_number or 'No Invoice Number'})"
