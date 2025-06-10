from django.contrib import admin
from .models import PurchaseOrder, PurchaseOrderLineItem


class PurchaseOrderLineItemInline(admin.TabularInline):
    model = PurchaseOrderLineItem
    extra = 1
    fields = ('item', 'quantity', 'unit_price', 'total')
    readonly_fields = ('total',)


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'vendor', 'company', 'date', 'required_delivery_date', 'total_amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'date', 'required_delivery_date', 'currency', 'vendor', 'company', 'created_at')
    search_fields = ('po_number', 'vendor__name', 'company__name', 'vendor__vendor_id', 'company__company_id')
    readonly_fields = ('total_amount', 'created_at', 'updated_at')
    date_hierarchy = 'date'
    ordering = ('-date', '-po_number')
    inlines = [PurchaseOrderLineItemInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('po_number', 'date', 'required_delivery_date', 'vendor', 'company')
        }),
        ('Financial Details', {
            'fields': ('currency', 'total_amount')
        }),
        ('Status & Control', {
            'fields': ('status',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('po_number',)
        return self.readonly_fields


@admin.register(PurchaseOrderLineItem)
class PurchaseOrderLineItemAdmin(admin.ModelAdmin):
    list_display = ('purchase_order', 'item', 'quantity', 'unit_price', 'total', 'created_at')
    list_filter = ('purchase_order__vendor', 'purchase_order__date', 'item', 'created_at')
    search_fields = ('purchase_order__po_number', 'item__item_code', 'item__description')
    readonly_fields = ('total', 'created_at', 'updated_at')
    ordering = ('-purchase_order__date', 'purchase_order__po_number')
    
    fieldsets = (
        ('Purchase Order & Item', {
            'fields': ('purchase_order', 'item')
        }),
        ('Quantities & Pricing', {
            'fields': ('quantity', 'unit_price', 'total')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
