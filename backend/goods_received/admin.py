from django.contrib import admin
from .models import GoodsReceived, GoodsReceivedLineItem


class GoodsReceivedLineItemInline(admin.TabularInline):
    model = GoodsReceivedLineItem
    extra = 1
    fields = ('item', 'quantity_ordered', 'quantity_received', 'delivery_status', 'notes')
    readonly_fields = ('delivery_status',)


@admin.register(GoodsReceived)
class GoodsReceivedAdmin(admin.ModelAdmin):
    list_display = ('gr_number', 'vendor', 'company', 'date', 'overall_status', 'purchase_order', 'created_at')
    list_filter = ('overall_status', 'date', 'vendor', 'company', 'purchase_order', 'created_at')
    search_fields = ('gr_number', 'vendor__name', 'company__name', 'purchase_order__po_number', 'vendor__vendor_id', 'company__company_id')
    readonly_fields = ('overall_status', 'created_at', 'updated_at')
    date_hierarchy = 'date'
    ordering = ('-date', '-gr_number')
    inlines = [GoodsReceivedLineItemInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('gr_number', 'date', 'vendor', 'company')
        }),
        ('Reference Information', {
            'fields': ('purchase_order',)
        }),
        ('Status & Notes', {
            'fields': ('overall_status', 'notes')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('gr_number',)
        return self.readonly_fields


@admin.register(GoodsReceivedLineItem)
class GoodsReceivedLineItemAdmin(admin.ModelAdmin):
    list_display = ('goods_received', 'item', 'quantity_ordered', 'quantity_received', 'delivery_status', 'created_at')
    list_filter = ('delivery_status', 'goods_received__vendor', 'goods_received__date', 'item', 'created_at')
    search_fields = ('goods_received__gr_number', 'item__item_code', 'item__description', 'notes')
    readonly_fields = ('delivery_status', 'created_at', 'updated_at')
    ordering = ('-goods_received__date', 'goods_received__gr_number')
    
    fieldsets = (
        ('Goods Received & Item', {
            'fields': ('goods_received', 'item')
        }),
        ('Quantities & Status', {
            'fields': ('quantity_ordered', 'quantity_received', 'delivery_status')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
