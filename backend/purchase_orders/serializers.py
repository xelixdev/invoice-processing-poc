from rest_framework import serializers
from .models import PurchaseOrder, PurchaseOrderLineItem
from invoices.serializers import CompanySerializer, VendorSerializer, ItemSerializer


class PurchaseOrderLineItemSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_description = serializers.CharField(source='item.description', read_only=True)
    
    class Meta:
        model = PurchaseOrderLineItem
        fields = [
            'id', 'item', 'item_code', 'item_description',
            'quantity', 'unit_price', 'total',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total', 'created_at', 'updated_at']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_id = serializers.CharField(source='vendor.vendor_id', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.CharField(source='company.company_id', read_only=True)
    line_items = PurchaseOrderLineItemSerializer(many=True, read_only=True)
    
    # Frontend-expected field names
    poNumber = serializers.CharField(source='po_number', read_only=True)
    vendorName = serializers.CharField(source='vendor.name', read_only=True)
    companyName = serializers.CharField(source='company.name', read_only=True)
    totalAmount = serializers.DecimalField(source='total_amount', max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'date', 'required_delivery_date',
            'vendor', 'vendor_id', 'vendor_name',
            'company', 'company_id', 'company_name',
            'currency', 'status', 'payment_terms', 'total_amount',
            'line_items',
            # Frontend-expected fields
            'poNumber', 'vendorName', 'companyName', 'totalAmount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_amount', 'created_at', 'updated_at']


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating purchase orders with line items."""
    line_items = PurchaseOrderLineItemSerializer(many=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'po_number', 'date', 'required_delivery_date',
            'vendor', 'company', 'currency', 'status', 'payment_terms',
            'line_items'
        ]
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items')
        purchase_order = PurchaseOrder.objects.create(**validated_data)
        
        for line_item_data in line_items_data:
            PurchaseOrderLineItem.objects.create(purchase_order=purchase_order, **line_item_data)
        
        return purchase_order 