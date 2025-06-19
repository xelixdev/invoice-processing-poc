from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth.models import User
from decimal import Decimal


class UserProfile(models.Model):
    """User profile to store additional user information."""
    DEPARTMENT_CHOICES = [
        ('IT', 'Information Technology'),
        ('Operations', 'Operations'),
        ('Sales', 'Sales'),
        ('Finance', 'Finance'),
        ('HR', 'Human Resources'),
        ('Procurement', 'Procurement'),
        ('Warehouse', 'Warehouse'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.department}"


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
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('review', 'Review'),
        ('pending_approval', 'Pending Approval'),
        ('in_approval', 'In Approval'),
        ('approved', 'Approved'),
        ('escalated', 'Escalated'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]

    invoice_number = models.CharField(max_length=50)
    date = models.DateField()
    due_date = models.DateField()
    po_number = models.CharField(max_length=50, blank=True)
    gr_number = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='invoices')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices')
    
    # User assignment for workflow management
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_invoices')
    
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


class AssignmentRule(models.Model):
    """Natural language rules for automatic invoice assignment."""
    USER_RULESET_CHOICES = [
        ('round_robin', 'Round Robin'),
        ('user_priority', 'User Priority'),
        ('random', 'Random'),
        ('least_assigned', 'Least Assigned'),
    ]
    
    FUNCTION_CHOICES = [
        ('IT', 'Information Technology'),
        ('Operations', 'Operations'),
        ('Sales', 'Sales'),
        ('Finance', 'Finance'),
        ('HR', 'Human Resources'),
        ('Procurement', 'Procurement'),
        ('Warehouse', 'Warehouse'),
    ]
    
    name = models.CharField(max_length=100, help_text="Short name for this rule")
    rule = models.TextField(help_text="Natural language description of when this rule applies")
    function_assignees = models.CharField(max_length=20, choices=FUNCTION_CHOICES, help_text="Department/function to assign to")
    user_ruleset = models.CharField(max_length=20, choices=USER_RULESET_CHOICES, default='round_robin', help_text="Method for selecting user within the function")
    is_active = models.BooleanField(default=True, help_text="Whether this rule is currently active")
    priority = models.IntegerField(default=100, help_text="Rule priority (lower numbers = higher priority)")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_assignment_rules', null=True, blank=True, help_text="User who created this rule")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['priority', 'created_at']
    
    def __str__(self):
        return f"{self.name} ({self.function_assignees})"
    
    def get_next_user(self):
        """Get the next user to assign based on the ruleset."""
        eligible_users = self.rule_users.filter(user__is_active=True).order_by('priority', 'id')
        
        if not eligible_users.exists():
            # Fallback to any active user in the department
            eligible_users = User.objects.filter(
                is_active=True,
                profile__department=self.function_assignees
            )
            if not eligible_users.exists():
                return None
        
        if self.user_ruleset == 'round_robin':
            return self._get_round_robin_user(eligible_users)
        elif self.user_ruleset == 'user_priority':
            return eligible_users.first().user if hasattr(eligible_users.first(), 'user') else eligible_users.first()
        elif self.user_ruleset == 'random':
            return eligible_users.order_by('?').first().user if hasattr(eligible_users.first(), 'user') else eligible_users.first()
        elif self.user_ruleset == 'least_assigned':
            return self._get_least_assigned_user(eligible_users)
        
        return eligible_users.first().user if hasattr(eligible_users.first(), 'user') else eligible_users.first()
    
    def _get_round_robin_user(self, eligible_users):
        """Implement round robin assignment."""
        # For round robin, we'll use a simple counter approach
        # In production, you might want to store last assigned user
        from django.db.models import Count
        
        if self.rule_users.exists():
            users_with_counts = []
            for rule_user in eligible_users:
                user = rule_user.user
                invoice_count = user.assigned_invoices.count()
                users_with_counts.append((user, invoice_count))
            
            # Sort by invoice count, then by priority
            users_with_counts.sort(key=lambda x: (x[1], rule_user.priority))
            return users_with_counts[0][0] if users_with_counts else None
        else:
            # Fallback to department users
            users_with_counts = []
            for user in eligible_users:
                invoice_count = user.assigned_invoices.count()
                users_with_counts.append((user, invoice_count))
            
            users_with_counts.sort(key=lambda x: x[1])
            return users_with_counts[0][0] if users_with_counts else None
    
    def _get_least_assigned_user(self, eligible_users):
        """Get user with least assigned invoices."""
        if self.rule_users.exists():
            users_with_counts = []
            for rule_user in eligible_users:
                user = rule_user.user
                invoice_count = user.assigned_invoices.count()
                users_with_counts.append((user, invoice_count, rule_user.priority))
            
            # Sort by invoice count, then by priority
            users_with_counts.sort(key=lambda x: (x[1], x[2]))
            return users_with_counts[0][0] if users_with_counts else None
        else:
            # Fallback to department users
            users_with_counts = []
            for user in eligible_users:
                invoice_count = user.assigned_invoices.count()
                users_with_counts.append((user, invoice_count))
            
            users_with_counts.sort(key=lambda x: x[1])
            return users_with_counts[0][0] if users_with_counts else None


class AssignmentRuleUser(models.Model):
    """User priority ordering for assignment rules."""
    assignment_rule = models.ForeignKey(AssignmentRule, on_delete=models.CASCADE, related_name='rule_users')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignment_rules')
    priority = models.IntegerField(help_text="Priority within this rule (lower numbers = higher priority)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['assignment_rule', 'user']
        ordering = ['priority', 'created_at']
    
    def __str__(self):
        return f"{self.assignment_rule.name} - {self.user.get_full_name()} (Priority: {self.priority})"
