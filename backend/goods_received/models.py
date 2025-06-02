from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from invoices.models import Company, Vendor, Item
from purchase_orders.models import PurchaseOrder


class GoodsReceived(models.Model):
    """Goods Received header model."""
    STATUS_CHOICES = [
        ('PARTIAL', 'Partial'),
        ('COMPLETE', 'Complete'),
        ('REJECTED', 'Rejected'),
    ]

    gr_number = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='goods_received', null=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='goods_received')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='goods_received')
    
    overall_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PARTIAL')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-gr_number']
        verbose_name = "Goods Received"
        verbose_name_plural = "Goods Received"

    def __str__(self):
        return f"{self.gr_number} - {self.vendor.name}"

    def update_status(self):
        """Update overall status based on line item statuses."""
        line_items = self.line_items.all()
        if not line_items.exists():
            self.overall_status = 'COMPLETE'
        else:
            statuses = set(line_items.values_list('delivery_status', flat=True))
            if len(statuses) == 1 and 'COMPLETE' in statuses:
                self.overall_status = 'COMPLETE'
            elif 'REJECTED' in statuses:
                self.overall_status = 'REJECTED'
            else:
                self.overall_status = 'PARTIAL'
        self.save()


class GoodsReceivedLineItem(models.Model):
    """Goods Received line item model."""
    STATUS_CHOICES = [
        ('PARTIAL', 'Partial'),
        ('COMPLETE', 'Complete'),
        ('REJECTED', 'Rejected'),
    ]

    goods_received = models.ForeignKey(GoodsReceived, on_delete=models.CASCADE, related_name='line_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    
    quantity_ordered = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    delivery_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PARTIAL')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['goods_received', 'item']

    def __str__(self):
        return f"{self.goods_received.gr_number} - {self.item.description}"

    def save(self, *args, **kwargs):
        """Update delivery status based on quantities."""
        if self.quantity_received == 0:
            self.delivery_status = 'REJECTED'
        elif self.quantity_received >= self.quantity_ordered:
            self.delivery_status = 'COMPLETE'
        else:
            self.delivery_status = 'PARTIAL'
        
        super().save(*args, **kwargs)
        
        # Update GR overall status
        self.goods_received.update_status()
