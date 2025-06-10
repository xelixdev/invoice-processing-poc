from django.contrib import admin
from .models import InvoiceExtractionJob, ExtractedInvoice, ExtractedLineItem


class ExtractedLineItemInline(admin.TabularInline):
    model = ExtractedLineItem
    extra = 0
    fields = ('description', 'quantity', 'unit_price', 'total')
    readonly_fields = ('created_at',)


@admin.register(InvoiceExtractionJob)
class InvoiceExtractionJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'original_filename', 'file_type', 'status', 'ai_service_used', 'processing_time_seconds', 'created_at', 'processed_at')
    list_filter = ('status', 'file_type', 'ai_service_used', 'created_at', 'processed_at')
    search_fields = ('original_filename', 'id', 'error_message')
    readonly_fields = ('id', 'created_at', 'updated_at', 'processed_at', 'processing_time_seconds')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('File Information', {
            'fields': ('id', 'original_filename', 'file_type', 'uploaded_file')
        }),
        ('Processing Status', {
            'fields': ('status', 'error_message')
        }),
        ('Processing Details', {
            'fields': ('ai_service_used', 'processing_time_seconds'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'processed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ExtractedInvoice)
class ExtractedInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'vendor', 'amount', 'currency_code', 'date', 'processed_to_invoice', 'extraction_job', 'created_at')
    list_filter = ('processed_to_invoice', 'currency_code', 'document_type', 'extraction_job__status', 'created_at')
    search_fields = ('invoice_number', 'po_number', 'vendor', 'billing_address', 'extraction_job__original_filename')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    inlines = [ExtractedLineItemInline]
    
    fieldsets = (
        ('Extraction Job', {
            'fields': ('extraction_job',)
        }),
        ('Document Information', {
            'fields': ('document_type', 'invoice_number', 'po_number')
        }),
        ('Financial Details', {
            'fields': ('amount', 'tax_amount', 'currency_code')
        }),
        ('Dates & Terms', {
            'fields': ('date', 'due_date', 'payment_term_days')
        }),
        ('Vendor Information', {
            'fields': ('vendor', 'billing_address', 'payment_method'),
            'classes': ('collapse',)
        }),
        ('Processing Status', {
            'fields': ('processed_to_invoice', 'processed_invoice_id')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ExtractedLineItem)
class ExtractedLineItemAdmin(admin.ModelAdmin):
    list_display = ('extracted_invoice', 'description', 'quantity', 'unit_price', 'total', 'created_at')
    list_filter = ('extracted_invoice__processed_to_invoice', 'extracted_invoice__currency_code', 'created_at')
    search_fields = ('description', 'extracted_invoice__invoice_number', 'extracted_invoice__vendor')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Extracted Invoice', {
            'fields': ('extracted_invoice',)
        }),
        ('Line Item Details', {
            'fields': ('description', 'quantity', 'unit_price', 'total')
        }),
        ('System Information', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
