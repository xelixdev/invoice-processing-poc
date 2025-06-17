from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import Company, Vendor, Item, Invoice, InvoiceLineItem, UserProfile, AssignmentRule, AssignmentRuleUser


class UserProfileInline(admin.StackedInline):
    """Inline admin for UserProfile."""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'


class CustomUserAdmin(UserAdmin):
    """Custom User admin with profile inline."""
    inlines = (UserProfileInline,)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin configuration for UserProfile."""
    list_display = ['user', 'department', 'created_at']
    list_filter = ['department', 'created_at']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'user__email']
    ordering = ['user__last_name', 'user__first_name']


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('company_id', 'name', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('company_id', 'name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('company_id',)


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('vendor_id', 'name', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('vendor_id', 'name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('vendor_id',)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('item_code', 'description', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('item_code', 'description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('item_code',)


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 1
    fields = ('item', 'quantity', 'unit_price', 'total', 'discount_percent', 'discount_amount', 'tax_rate')
    readonly_fields = ('total', 'discount_amount')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin configuration for Invoice."""
    list_display = ['invoice_number', 'vendor', 'company', 'assigned_to', 'date', 'due_date', 'total_due', 'currency']
    list_filter = ['currency', 'vendor', 'company', 'assigned_to__profile__department', 'date']
    search_fields = ['invoice_number', 'po_number', 'gr_number', 'vendor__name', 'company__name']
    date_hierarchy = 'date'
    ordering = ['-date', '-invoice_number']
    inlines = [InvoiceLineItemInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('invoice_number', 'date', 'due_date', 'assigned_to')
        }),
        ('References', {
            'fields': ('po_number', 'gr_number', 'vendor', 'company')
        }),
        ('Financial Details', {
            'fields': ('currency', 'payment_terms', 'billing_address')
        }),
        ('Totals', {
            'fields': ('sub_total', 'discount_amount', 'tax_amount', 'shipping', 'total_due'),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('invoice_number',)
        return self.readonly_fields


@admin.register(InvoiceLineItem)
class InvoiceLineItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'item', 'quantity', 'unit_price', 'total', 'discount_amount', 'tax_rate')
    list_filter = ('invoice__vendor', 'invoice__date', 'item', 'created_at')
    search_fields = ('invoice__invoice_number', 'item__item_code', 'item__description')
    readonly_fields = ('total', 'discount_amount', 'created_at', 'updated_at')
    ordering = ('-invoice__date', 'invoice__invoice_number')
    
    fieldsets = (
        ('Invoice & Item', {
            'fields': ('invoice', 'item')
        }),
        ('Quantities & Pricing', {
            'fields': ('quantity', 'unit_price', 'total')
        }),
        ('Discounts & Tax', {
            'fields': ('discount_percent', 'discount_amount', 'tax_rate')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class AssignmentRuleUserInline(admin.TabularInline):
    """Inline admin for AssignmentRuleUser."""
    model = AssignmentRuleUser
    extra = 1
    ordering = ['priority']
    autocomplete_fields = ['user']


@admin.register(AssignmentRule)
class AssignmentRuleAdmin(admin.ModelAdmin):
    """Admin configuration for AssignmentRule."""
    list_display = ['name', 'function_assignees', 'user_ruleset', 'is_active', 'priority', 'created_at']
    list_filter = ['function_assignees', 'user_ruleset', 'is_active', 'created_at']
    search_fields = ['name', 'rule']
    ordering = ['priority', 'created_at']
    inlines = [AssignmentRuleUserInline]
    
    fieldsets = (
        ('Rule Definition', {
            'fields': ('name', 'rule', 'function_assignees')
        }),
        ('Assignment Method', {
            'fields': ('user_ruleset', 'priority', 'is_active')
        }),
    )


@admin.register(AssignmentRuleUser)
class AssignmentRuleUserAdmin(admin.ModelAdmin):
    """Admin configuration for AssignmentRuleUser."""
    list_display = ['assignment_rule', 'user', 'priority', 'created_at']
    list_filter = ['assignment_rule__function_assignees', 'assignment_rule', 'created_at']
    search_fields = ['assignment_rule__name', 'user__username', 'user__first_name', 'user__last_name']
    ordering = ['assignment_rule', 'priority']
    autocomplete_fields = ['assignment_rule', 'user']

# Unregister the original User admin and register the custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
