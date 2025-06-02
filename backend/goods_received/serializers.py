from rest_framework import serializers
from .models import GoodsReceived, GoodsReceivedLineItem
from invoices.serializers import CompanySerializer, VendorSerializer, ItemSerializer
from purchase_orders.serializers import PurchaseOrderSerializer


class GoodsReceivedLineItemSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_description = serializers.CharField(source='item.description', read_only=True)
    
    class Meta:
        model = GoodsReceivedLineItem
        fields = [
            'id', 'item', 'item_code', 'item_description',
            'quantity_ordered', 'quantity_received', 'delivery_status',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'delivery_status', 'created_at', 'updated_at']


class GoodsReceivedSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_id = serializers.CharField(source='vendor.vendor_id', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.CharField(source='company.company_id', read_only=True)
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    line_items = GoodsReceivedLineItemSerializer(many=True, read_only=True)
    
    # Frontend-expected field names
    grNumber = serializers.CharField(source='gr_number', read_only=True)
    poNumber = serializers.CharField(source='purchase_order.po_number', read_only=True)
    vendor = serializers.CharField(source='vendor.name', read_only=True)
    status = serializers.CharField(source='overall_status', read_only=True)
    
    class Meta:
        model = GoodsReceived
        fields = [
            'id', 'gr_number', 'date',
            'purchase_order', 'po_number',
            'vendor', 'vendor_id', 'vendor_name',
            'company', 'company_id', 'company_name',
            'overall_status', 'notes',
            'line_items',
            # Frontend-expected fields
            'grNumber', 'poNumber', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'overall_status', 'created_at', 'updated_at']


class GoodsReceivedCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating goods received with line items."""
    line_items = GoodsReceivedLineItemSerializer(many=True)
    
    class Meta:
        model = GoodsReceived
        fields = [
            'gr_number', 'date', 'purchase_order',
            'vendor', 'company', 'notes',
            'line_items'
        ]
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items')
        goods_received = GoodsReceived.objects.create(**validated_data)
        
        for line_item_data in line_items_data:
            GoodsReceivedLineItem.objects.create(goods_received=goods_received, **line_item_data)
        
        return goods_received 