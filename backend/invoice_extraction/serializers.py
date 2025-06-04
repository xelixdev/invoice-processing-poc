from rest_framework import serializers
from .models import InvoiceExtractionJob, ExtractedInvoice, ExtractedLineItem


class ExtractedLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedLineItem
        fields = [
            'id', 'description', 'quantity', 'unit_price', 'total',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExtractedInvoiceSerializer(serializers.ModelSerializer):
    line_items = ExtractedLineItemSerializer(many=True, read_only=True)
    number = serializers.CharField(source='invoice_number', read_only=True)
    
    class Meta:
        model = ExtractedInvoice
        fields = [
            'id', 'document_type', 'invoice_number', 'number', 'po_number',
            'amount', 'tax_amount', 'currency_code', 'date', 'due_date',
            'payment_term_days', 'vendor', 'processed_to_invoice',
            'processed_invoice_id', 'line_items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceExtractionJobSerializer(serializers.ModelSerializer):
    extracted_invoices = ExtractedInvoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = InvoiceExtractionJob
        fields = [
            'id', 'original_filename', 'file_type', 'uploaded_file',
            'status', 'error_message', 'ai_service_used',
            'processing_time_seconds', 'extracted_invoices',
            'created_at', 'updated_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'status', 'error_message', 'ai_service_used',
            'processing_time_seconds', 'created_at', 'updated_at', 'processed_at'
        ]


class InvoiceExtractionUploadSerializer(serializers.Serializer):
    """Serializer for file upload."""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file type and size."""
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.csv']
        filename = value.name.lower()
        
        if not any(filename.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                "Unsupported file type. Please upload a PDF, JPG, JPEG, PNG, or CSV file."
            )
        
        # Check file size (10MB limit)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "File size too large. Please upload a file smaller than 10MB."
            )
        
        return value 