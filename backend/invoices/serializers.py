from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, Vendor, Item, Invoice, InvoiceLineItem, AssignmentRule, AssignmentRuleUser
from datetime import date, timedelta


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'company_id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'vendor_id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'item_code', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with profile information."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    department = serializers.CharField(source='profile.department', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'department', 'email', 'is_active']
        read_only_fields = ['id', 'is_active']


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_description = serializers.CharField(source='item.description', read_only=True)
    
    class Meta:
        model = InvoiceLineItem
        fields = [
            'id', 'item', 'item_code', 'item_description',
            'quantity', 'unit_price', 'total',
            'discount_percent', 'discount_amount', 'tax_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total', 'discount_amount', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_id = serializers.CharField(source='vendor.vendor_id', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.CharField(source='company.company_id', read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    
    # Nested assigned user information
    assigned_user = UserSerializer(source='assigned_to', read_only=True)
    
    # Frontend-expected field names
    invoiceNumber = serializers.CharField(source='invoice_number', read_only=True)
    dueDate = serializers.DateField(source='due_date', read_only=True)
    poNumber = serializers.CharField(source='po_number', read_only=True)
    grNumber = serializers.CharField(source='gr_number', read_only=True)
    vendor = serializers.CharField(source='vendor.name', read_only=True)
    amount = serializers.DecimalField(source='total_due', max_digits=12, decimal_places=2, read_only=True)
    status = serializers.SerializerMethodField()
    match = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'date', 'due_date',
            'po_number', 'gr_number',
            'vendor', 'vendor_id', 'vendor_name',
            'company', 'company_id', 'company_name',
            'assigned_to', 'assigned_user',  # Include both for backward compatibility
            'currency', 'payment_terms',
            'billing_address',
            'sub_total', 'discount_amount', 'tax_amount',
            'shipping', 'total_due',
            'line_items',
            # Frontend-expected fields
            'invoiceNumber', 'dueDate', 'poNumber', 'grNumber',
            'amount', 'status', 'match',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sub_total', 'discount_amount', 'tax_amount', 'total_due',
            'created_at', 'updated_at'
        ]
    
    def get_status(self, obj):
        """Return a status based on due date and other factors."""
        today = date.today()
        
        if not obj.due_date:
            return "In Approval"  # No due date set
        elif obj.due_date < today:
            return "Review"  # Overdue
        elif obj.due_date <= today + timedelta(days=7):
            return "In Approval"  # Due soon
        else:
            return "Approved"  # Not due yet
    
    def get_match(self, obj):
        """Return a match color based on PO/GR linking."""
        if obj.po_number and obj.gr_number:
            return "green"  # Fully matched
        elif obj.po_number or obj.gr_number:
            return "yellow"  # Partially matched
        else:
            return "red"  # No matching


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoices with line items."""
    line_items = InvoiceLineItemSerializer(many=True)
    
    class Meta:
        model = Invoice
        fields = [
            'invoice_number', 'date', 'due_date',
            'po_number', 'gr_number',
            'vendor', 'company',
            'currency', 'payment_terms', 'shipping',
            'line_items'
        ]
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items')
        invoice = Invoice.objects.create(**validated_data)
        
        for line_item_data in line_items_data:
            InvoiceLineItem.objects.create(invoice=invoice, **line_item_data)
        
        return invoice


class AssignmentRuleUserSerializer(serializers.ModelSerializer):
    """Serializer for AssignmentRuleUser."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = AssignmentRuleUser
        fields = ['id', 'user', 'priority', 'created_at']


class AssignmentRuleSerializer(serializers.ModelSerializer):
    """Serializer for AssignmentRule."""
    rule_users = AssignmentRuleUserSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = AssignmentRule
        fields = [
            'id', 'name', 'rule', 'function_assignees', 'user_ruleset', 
            'is_active', 'priority', 'created_by', 'created_by_name', 'created_by_username',
            'created_at', 'updated_at', 'rule_users'
        ] 