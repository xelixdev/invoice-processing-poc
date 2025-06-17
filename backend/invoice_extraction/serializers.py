from rest_framework import serializers
from .models import InvoiceExtractionJob, ExtractedInvoice, ExtractedLineItem
from purchase_orders.models import PurchaseOrder


class ExtractedLineItemSerializer(serializers.ModelSerializer):
    """Serializer for ExtractedLineItem model."""
    
    class Meta:
        model = ExtractedLineItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']


class ExtractedInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for ExtractedInvoice model."""
    
    line_items = ExtractedLineItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = ExtractedInvoice
        fields = [
            'id', 'invoice_number', 'po_number', 'amount', 'tax_amount',
            'currency_code', 'date', 'due_date', 'payment_term_days', 
            'vendor', 'billing_address', 'payment_method', 'created_at', 'line_items'
        ]


class InvoiceExtractionJobSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceExtractionJob model."""
    
    extracted_invoices = ExtractedInvoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = InvoiceExtractionJob
        fields = [
            'id', 'original_filename', 'file_type', 'status', 'ai_service_used',
            'processing_time_seconds', 'error_message', 'created_at', 'updated_at',
            'extracted_invoices'
        ]


class InvoiceExtractionUploadSerializer(serializers.Serializer):
    """Serializer for file upload validation."""
    
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate uploaded file."""
        if not value:
            raise serializers.ValidationError("No file provided")
        
        # Check file size (limit to 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB")
        
        # Check file type
        allowed_extensions = ['.pdf', '.csv', '.jpg', '.jpeg', '.png']
        file_extension = value.name.lower().split('.')[-1]
        if f'.{file_extension}' not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value


class ExtractAndMatchRequestSerializer(serializers.Serializer):
    """Serializer for extract and match request validation."""
    
    file = serializers.FileField()
    match_threshold = serializers.IntegerField(default=2, min_value=0, max_value=10)
    
    def validate_file(self, value):
        """Validate uploaded file using the upload serializer logic."""
        upload_serializer = InvoiceExtractionUploadSerializer()
        return upload_serializer.validate_file(value)


class MatchedPOSerializer(serializers.ModelSerializer):
    """Serializer for matched PurchaseOrder data."""
    
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'vendor_name', 'company_name', 
            'total_amount', 'status', 'date', 'required_delivery_date', 'currency'
        ]


class DataComparisonSerializer(serializers.Serializer):
    """Serializer for data comparison results."""
    
    overall_status = serializers.CharField()
    
    # Individual comparison details
    comparisons = serializers.DictField(child=serializers.DictField())
    
    class Meta:
        fields = ['overall_status', 'comparisons']


class MatchingInfoSerializer(serializers.Serializer):
    """Serializer for matching information embedded in invoice."""
    
    matched_po = MatchedPOSerializer(allow_null=True)
    match_confidence = serializers.IntegerField()
    match_type = serializers.CharField()
    data_comparison = DataComparisonSerializer(allow_null=True)
    
    class Meta:
        fields = ['matched_po', 'match_confidence', 'match_type', 'data_comparison']


class AssignmentRuleInfoSerializer(serializers.Serializer):
    """Serializer for assignment rule information."""
    
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    department = serializers.CharField()
    priority = serializers.IntegerField()
    
    class Meta:
        fields = ['id', 'name', 'description', 'department', 'priority']


class AssignedUserSerializer(serializers.Serializer):
    """Serializer for assigned user information."""
    
    # User information
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.CharField()
    department = serializers.CharField()
    email = serializers.CharField()
    
    # Assignment details
    rule = AssignmentRuleInfoSerializer()
    confidence = serializers.FloatField(allow_null=True)
    explanation = serializers.CharField()
    
    class Meta:
        fields = [
            'id', 'username', 'full_name', 'department', 'email',
            'rule', 'confidence', 'explanation'
        ]


class InvoiceWithMatchingSerializer(serializers.Serializer):
    """Serializer for invoice data with embedded matching results."""
    
    # Core invoice fields
    invoice_number = serializers.CharField(allow_null=True)
    po_number = serializers.CharField(allow_null=True)
    amount = serializers.FloatField()
    subtotal = serializers.FloatField(allow_null=True)
    tax_amount = serializers.FloatField()
    currency_code = serializers.CharField()
    date = serializers.CharField(allow_null=True)
    due_date = serializers.CharField(allow_null=True)
    payment_term_days = serializers.CharField(allow_null=True)
    vendor = serializers.CharField(allow_null=True)
    billing_address = serializers.CharField(allow_null=True)
    payment_method = serializers.CharField(allow_null=True)
    line_items = ExtractedLineItemSerializer(many=True)
    
    # Embedded matching information
    matching = MatchingInfoSerializer()
    
    # Assignment information
    assigned_user = AssignedUserSerializer(allow_null=True)
    
    class Meta:
        fields = [
            'invoice_number', 'po_number', 'amount', 'subtotal', 'tax_amount',
            'currency_code', 'date', 'due_date', 'payment_term_days', 
            'vendor', 'billing_address', 'payment_method', 'line_items', 
            'matching', 'assigned_user'
        ]


class ExtractAndMatchResponseSerializer(serializers.Serializer):
    """Serializer for the simplified extract and match response."""
    
    invoices = InvoiceWithMatchingSerializer(many=True)
    
    class Meta:
        fields = ['invoices']


# Utility serializers for data transformation

class InvoiceDataForComparisonSerializer(serializers.Serializer):
    """Serializer for preparing invoice data for comparison."""
    
    amount = serializers.FloatField(allow_null=True)
    currency_code = serializers.CharField(allow_null=True)
    payment_term_days = serializers.IntegerField(allow_null=True)
    vendor = serializers.CharField(allow_null=True)
    
    class Meta:
        fields = ['amount', 'currency_code', 'payment_term_days', 'vendor']


class PODataForComparisonSerializer(serializers.Serializer):
    """Serializer for preparing PO data for comparison."""
    
    total_amount = serializers.FloatField()
    currency = serializers.CharField()
    payment_term_days = serializers.IntegerField(allow_null=True)
    vendor_name = serializers.CharField()
    
    class Meta:
        fields = ['total_amount', 'currency', 'payment_term_days', 'vendor_name']


class WorkflowStepSerializer(serializers.Serializer):
    """Serializer for individual workflow step results."""
    
    step_name = serializers.CharField()
    status = serializers.CharField()  # 'success', 'failed', 'skipped'
    duration_seconds = serializers.FloatField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)
    
    class Meta:
        fields = ['step_name', 'status', 'duration_seconds', 'error_message'] 