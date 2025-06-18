from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Company, Vendor, Item, Invoice, InvoiceLineItem, AssignmentRule, AssignmentRuleUser
from .serializers import (
    CompanySerializer, VendorSerializer, ItemSerializer,
    InvoiceSerializer, InvoiceCreateSerializer, InvoiceLineItemSerializer,
    AssignmentRuleSerializer
)
from django.contrib.auth.models import User
from .assignment_service import InvoiceAssignmentService


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

    @action(detail=True, methods=['post'])
    def assign_user(self, request, pk=None):
        """Manually assign an invoice to a user."""
        invoice = self.get_object()
        username = request.data.get('username')
        
        if not username:
            return Response(
                {'error': 'Username is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(username=username)
            invoice.assigned_to = user
            invoice.save()
            
            return Response({
                'message': f'Invoice {invoice.invoice_number} assigned to {user.get_full_name()}',
                'assigned_to': user.username
            })
        except User.DoesNotExist:
            return Response(
                {'error': f'User {username} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def auto_assign(self, request, pk=None):
        """Auto-assign an invoice using assignment rules."""
        invoice = self.get_object()
        assignment_service = InvoiceAssignmentService()
        
        force_reassign = request.data.get('force_reassign', False)
        assigned_user = assignment_service.assign_invoice(invoice, force_reassign)
        
        if assigned_user:
            return Response({
                'message': f'Invoice {invoice.invoice_number} auto-assigned to {assigned_user.get_full_name()}',
                'assigned_to': assigned_user.username
            })
        else:
            return Response({
                'message': f'Could not auto-assign invoice {invoice.invoice_number}',
                'assigned_to': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_auto_assign(self, request):
        """Auto-assign multiple invoices."""
        assignment_service = InvoiceAssignmentService()
        
        invoice_numbers = request.data.get('invoice_numbers', [])
        force_reassign = request.data.get('force_reassign', False)
        
        if not invoice_numbers:
            # Assign all unassigned invoices
            invoices = Invoice.objects.filter(assigned_to__isnull=True)
        else:
            invoices = Invoice.objects.filter(invoice_number__in=invoice_numbers)
        
        results = []
        for invoice in invoices:
            assigned_user = assignment_service.assign_invoice(invoice, force_reassign)
            results.append({
                'invoice_number': invoice.invoice_number,
                'assigned_to': assigned_user.username if assigned_user else None,
                'success': assigned_user is not None
            })
        
        return Response({
            'results': results,
            'total_processed': len(results),
            'successful_assignments': len([r for r in results if r['success']])
        })


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for InvoiceLineItem model."""
    queryset = InvoiceLineItem.objects.select_related('invoice', 'item')
    serializer_class = InvoiceLineItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['invoice', 'item']
    search_fields = ['item__item_code', 'item__description']
    ordering_fields = ['quantity', 'unit_price', 'total', 'created_at']
    ordering = ['created_at']


class AssignmentRuleViewSet(viewsets.ModelViewSet):
    """API endpoint for managing assignment rules."""
    queryset = AssignmentRule.objects.all()
    serializer_class = AssignmentRuleSerializer
    
    @action(detail=False, methods=['post'])
    def create_from_frontend(self, request):
        """Create assignment rules from frontend data format."""
        assignment_service = InvoiceAssignmentService()
        
        rules_data = request.data.get('rules', [])
        created_rules = []
        
        for rule_data in rules_data:
            try:
                rule = assignment_service.create_rule_from_data(rule_data)
                created_rules.append(rule)
            except Exception as e:
                return Response(
                    {'error': f'Failed to create rule: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = self.get_serializer(created_rules, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def frontend_format(self, request):
        """Get all rules in frontend data format."""
        assignment_service = InvoiceAssignmentService()
        rules = self.get_queryset()
        
        frontend_data = []
        for rule in rules:
            frontend_data.append(assignment_service.get_rule_data_format(rule))
        
        return Response(frontend_data)
    
    @action(detail=True, methods=['post'])
    def test_assignment(self, request, pk=None):
        """Test rule assignment against invoices."""
        rule = self.get_object()
        assignment_service = InvoiceAssignmentService()
        
        # Get all invoices and see which ones match this rule
        invoices = Invoice.objects.all()
        matching_invoices = []
        
        for invoice in invoices:
            if assignment_service._rule_matches_invoice(rule, invoice):
                matching_invoices.append({
                    'invoice_number': invoice.invoice_number,
                    'vendor': invoice.vendor.name,
                    'total_due': str(invoice.total_due),
                    'assigned_to': invoice.assigned_to.username if invoice.assigned_to else None
                })
        
        return Response({
            'rule_name': rule.name,
            'matching_invoices': matching_invoices,
            'match_count': len(matching_invoices)
        })
