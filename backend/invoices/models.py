from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Company(models.Model):
    """Company model for both vendors and clients."""
    company_id = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self):
        return f"{self.company_id} - {self.name}"


class Vendor(models.Model):
    """Vendor model."""
    vendor_id = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vendor_id} - {self.name}"


class Item(models.Model):
    """Item/Product model."""
    item_code = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.item_code} - {self.description}"


class Invoice(models.Model):
    """Invoice header model."""
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    due_date = models.DateField()
    po_number = models.CharField(max_length=50, blank=True)
    gr_number = models.CharField(max_length=50, blank=True)
    
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='invoices')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices')
    
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    payment_terms = models.CharField(max_length=50)
    billing_address = models.CharField(max_length=500, blank=True, null=True)
    
    sub_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    shipping = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-invoice_number']

    def __str__(self):
        return f"{self.invoice_number} - {self.vendor.name}"

    def calculate_totals(self):
        """Calculate invoice totals from line items."""
        line_items = self.line_items.all()
        
        item_total = sum(item.total for item in line_items)
        discount_total = sum(item.discount_amount for item in line_items)
        
        self.sub_total = item_total - discount_total
        self.discount_amount = discount_total
        
        # Tax calculation (could be more sophisticated)
        tax_rates = line_items.values_list('tax_rate', flat=True).distinct()
        if tax_rates:
            # For simplicity, use the first tax rate found
            tax_rate = tax_rates[0] if tax_rates[0] else Decimal('0')
            self.tax_amount = (self.sub_total * tax_rate / 100).quantize(Decimal('0.01'))
        
        self.total_due = self.sub_total + self.tax_amount + self.shipping
        self.save()


class InvoiceLineItem(models.Model):
    """Invoice line item model."""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    total = models.DecimalField(max_digits=12, decimal_places=2)
    
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['invoice', 'item']

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.item.description}"

    def save(self, *args, **kwargs):
        """Calculate totals before saving."""
        # Calculate total before discount
        self.total = self.quantity * self.unit_price
        
        # Calculate discount amount
        if self.discount_percent > 0:
            self.discount_amount = (self.total * self.discount_percent / 100).quantize(Decimal('0.01'))
        
        super().save(*args, **kwargs)
        
        # Update invoice totals
        self.invoice.calculate_totals()
