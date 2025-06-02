from django.shortcuts import render
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Company, Vendor, Item, Invoice, InvoiceLineItem
from .serializers import (
    CompanySerializer, VendorSerializer, ItemSerializer,
    InvoiceSerializer, InvoiceCreateSerializer, InvoiceLineItemSerializer
)


class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for Company model."""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['company_id']
    search_fields = ['company_id', 'name']
    ordering_fields = ['company_id', 'name', 'created_at']
    ordering = ['company_id']


class VendorViewSet(viewsets.ModelViewSet):
    """ViewSet for Vendor model."""
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor_id']
    search_fields = ['vendor_id', 'name']
    ordering_fields = ['vendor_id', 'name', 'created_at']
    ordering = ['vendor_id']


class ItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Item model."""
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['item_code']
    search_fields = ['item_code', 'description']
    ordering_fields = ['item_code', 'description', 'created_at']
    ordering = ['item_code']


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Invoice model."""
    queryset = Invoice.objects.select_related('vendor', 'company').prefetch_related('line_items__item')
    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor', 'company', 'currency', 'po_number']
    search_fields = ['invoice_number', 'vendor__name', 'company__name']
    ordering_fields = ['date', 'invoice_number', 'total_due', 'created_at']
    ordering = ['-date', '-invoice_number']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get invoice summary statistics."""
        queryset = self.filter_queryset(self.get_queryset())
        
        total_invoices = queryset.count()
        total_amount = sum(invoice.total_due for invoice in queryset)
        
        # Group by vendor
        vendor_summary = {}
        for invoice in queryset:
            vendor_name = invoice.vendor.name
            if vendor_name not in vendor_summary:
                vendor_summary[vendor_name] = {
                    'count': 0,
                    'total_amount': 0
                }
            vendor_summary[vendor_name]['count'] += 1
            vendor_summary[vendor_name]['total_amount'] += float(invoice.total_due)
        
        return Response({
            'total_invoices': total_invoices,
            'total_amount': total_amount,
            'vendor_summary': vendor_summary
        })

    @action(detail=True, methods=['get'])
    def line_items(self, request, pk=None):
        """Get line items for a specific invoice."""
        invoice = self.get_object()
        line_items = invoice.line_items.select_related('item')
        serializer = InvoiceLineItemSerializer(line_items, many=True)
        return Response(serializer.data)


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for InvoiceLineItem model."""
    queryset = InvoiceLineItem.objects.select_related('invoice', 'item')
    serializer_class = InvoiceLineItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['invoice', 'item']
    search_fields = ['item__item_code', 'item__description']
    ordering_fields = ['quantity', 'unit_price', 'total', 'created_at']
    ordering = ['created_at']
