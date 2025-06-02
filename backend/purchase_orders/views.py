from django.shortcuts import render
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import PurchaseOrder, PurchaseOrderLineItem
from .serializers import (
    PurchaseOrderSerializer, PurchaseOrderCreateSerializer, PurchaseOrderLineItemSerializer
)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for PurchaseOrder model."""
    queryset = PurchaseOrder.objects.select_related('vendor', 'company').prefetch_related('line_items__item')
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor', 'company', 'currency', 'status']
    search_fields = ['po_number', 'vendor__name', 'company__name']
    ordering_fields = ['date', 'po_number', 'total_amount', 'created_at']
    ordering = ['-date', '-po_number']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get purchase order summary statistics."""
        queryset = self.filter_queryset(self.get_queryset())
        
        total_pos = queryset.count()
        total_amount = sum(po.total_amount for po in queryset)
        
        # Group by status
        status_summary = {}
        for po in queryset:
            status = po.status
            if status not in status_summary:
                status_summary[status] = {
                    'count': 0,
                    'total_amount': 0
                }
            status_summary[status]['count'] += 1
            status_summary[status]['total_amount'] += float(po.total_amount)
        
        return Response({
            'total_purchase_orders': total_pos,
            'total_amount': total_amount,
            'status_summary': status_summary
        })


class PurchaseOrderLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for PurchaseOrderLineItem model."""
    queryset = PurchaseOrderLineItem.objects.select_related('purchase_order', 'item')
    serializer_class = PurchaseOrderLineItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['purchase_order', 'item']
    search_fields = ['item__item_code', 'item__description']
    ordering_fields = ['quantity', 'unit_price', 'total', 'created_at']
    ordering = ['created_at']
