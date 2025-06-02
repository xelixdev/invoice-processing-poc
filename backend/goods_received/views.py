from django.shortcuts import render
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import GoodsReceived, GoodsReceivedLineItem
from .serializers import (
    GoodsReceivedSerializer, GoodsReceivedCreateSerializer, GoodsReceivedLineItemSerializer
)


class GoodsReceivedViewSet(viewsets.ModelViewSet):
    """ViewSet for GoodsReceived model."""
    queryset = GoodsReceived.objects.select_related('vendor', 'company', 'purchase_order').prefetch_related('line_items__item')
    serializer_class = GoodsReceivedSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor', 'company', 'purchase_order', 'overall_status']
    search_fields = ['gr_number', 'vendor__name', 'company__name', 'purchase_order__po_number']
    ordering_fields = ['date', 'gr_number', 'created_at']
    ordering = ['-date', '-gr_number']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return GoodsReceivedCreateSerializer
        return GoodsReceivedSerializer

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get goods received summary statistics."""
        queryset = self.filter_queryset(self.get_queryset())
        
        total_grs = queryset.count()
        
        # Group by status
        status_summary = {}
        for gr in queryset:
            status = gr.overall_status
            if status not in status_summary:
                status_summary[status] = {'count': 0}
            status_summary[status]['count'] += 1
        
        return Response({
            'total_goods_received': total_grs,
            'status_summary': status_summary
        })


class GoodsReceivedLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for GoodsReceivedLineItem model."""
    queryset = GoodsReceivedLineItem.objects.select_related('goods_received', 'item')
    serializer_class = GoodsReceivedLineItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['goods_received', 'item', 'delivery_status']
    search_fields = ['item__item_code', 'item__description']
    ordering_fields = ['quantity_ordered', 'quantity_received', 'created_at']
    ordering = ['created_at']
