from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from invoices.models import Company, Vendor, Item


class PurchaseOrder(models.Model):
    """Purchase Order header model."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
    ]

    po_number = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    required_delivery_date = models.DateField()
    
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='purchase_orders')
    
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-po_number']

    def __str__(self):
        return f"{self.po_number} - {self.vendor.name}"

    def calculate_total(self):
        """Calculate total amount from line items."""
        line_items = self.line_items.all()
        self.total_amount = sum(item.total for item in line_items)
        self.save()


class PurchaseOrderLineItem(models.Model):
    """Purchase Order line item model."""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='line_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    total = models.DecimalField(max_digits=12, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['purchase_order', 'item']

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.item.description}"

    def save(self, *args, **kwargs):
        """Calculate total before saving."""
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Update PO total
        self.purchase_order.calculate_total()
