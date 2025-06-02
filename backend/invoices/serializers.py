from rest_framework import serializers
from .models import Company, Vendor, Item, Invoice, InvoiceLineItem


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
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'date', 'due_date',
            'po_number', 'gr_number',
            'vendor', 'vendor_id', 'vendor_name',
            'company', 'company_id', 'company_name',
            'currency', 'payment_terms',
            'sub_total', 'discount_amount', 'tax_amount',
            'shipping', 'total_due',
            'line_items',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sub_total', 'discount_amount', 'tax_amount', 'total_due',
            'created_at', 'updated_at'
        ]


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