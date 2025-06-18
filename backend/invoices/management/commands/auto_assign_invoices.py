from django.core.management.base import BaseCommand
from invoices.models import Invoice
from invoices.assignment_service import InvoiceAssignmentService


class Command(BaseCommand):
    help = 'Automatically assign invoices to users based on assignment rules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force-reassign',
            action='store_true',
            help='Force reassignment of already assigned invoices'
        )
        parser.add_argument(
            '--invoice-id',
            type=str,
            help='Assign specific invoice by invoice number'
        )

    def handle(self, *args, **options):
        force_reassign = options['force_reassign']
        invoice_id = options.get('invoice_id')
        
        assignment_service = InvoiceAssignmentService()
        
        if invoice_id:
            # Assign specific invoice
            try:
                invoice = Invoice.objects.get(invoice_number=invoice_id)
                assigned_user = assignment_service.assign_invoice(invoice, force_reassign)
                
                if assigned_user:
                    self.stdout.write(
                        self.style.SUCCESS(f'Assigned invoice {invoice_id} to {assigned_user}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Could not assign invoice {invoice_id}')
                    )
            except Invoice.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Invoice {invoice_id} not found')
                )
        else:
            # Assign all invoices
            invoices = Invoice.objects.all()
            
            if not force_reassign:
                invoices = invoices.filter(assigned_to__isnull=True)
            
            total_invoices = invoices.count()
            assigned_count = 0
            
            self.stdout.write(f'Processing {total_invoices} invoices...')
            
            for invoice in invoices:
                assigned_user = assignment_service.assign_invoice(invoice, force_reassign)
                if assigned_user:
                    assigned_count += 1
                    self.stdout.write(f'  ✓ {invoice.invoice_number} → {assigned_user}')
                else:
                    self.stdout.write(f'  ✗ {invoice.invoice_number} → No assignment')
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully assigned {assigned_count}/{total_invoices} invoices')
            ) 