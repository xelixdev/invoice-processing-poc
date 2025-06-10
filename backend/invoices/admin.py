from django.contrib import admin
from .models import Company, Vendor, Item, Invoice, InvoiceLineItem


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
    list_display = ('invoice_number', 'vendor', 'company', 'date', 'due_date', 'total_due', 'currency', 'created_at')
    list_filter = ('date', 'due_date', 'currency', 'vendor', 'company', 'created_at')
    search_fields = ('invoice_number', 'po_number', 'gr_number', 'vendor__name', 'company__name')
    readonly_fields = ('sub_total', 'discount_amount', 'tax_amount', 'total_due', 'created_at', 'updated_at')
    date_hierarchy = 'date'
    ordering = ('-date', '-invoice_number')
    inlines = [InvoiceLineItemInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('invoice_number', 'date', 'due_date', 'vendor', 'company')
        }),
        ('Reference Numbers', {
            'fields': ('po_number', 'gr_number'),
            'classes': ('collapse',)
        }),
        ('Financial Details', {
            'fields': ('currency', 'payment_terms', 'sub_total', 'discount_amount', 'tax_amount', 'shipping', 'total_due')
        }),
        ('Additional Information', {
            'fields': ('billing_address',),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
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
