import csv
import os
from decimal import Decimal
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from invoices.models import Company, Vendor, Item, Invoice, InvoiceLineItem
from purchase_orders.models import PurchaseOrder, PurchaseOrderLineItem
from goods_received.models import GoodsReceived, GoodsReceivedLineItem


class Command(BaseCommand):
    help = 'Load data from CSV files into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fixtures-dir',
            type=str,
            default='fixtures',
            help='Directory containing CSV files (default: fixtures)'
        )
        parser.add_argument(
            '--clear-data',
            action='store_true',
            help='Clear existing data before loading new data'
        )

    def handle(self, *args, **options):
        fixtures_dir = options['fixtures_dir']
        clear_data = options['clear_data']
        base_dir = settings.BASE_DIR
        fixtures_path = os.path.join(base_dir, fixtures_dir)

        if not os.path.exists(fixtures_path):
            self.stdout.write(
                self.style.ERROR(f'Fixtures directory not found: {fixtures_path}')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Starting CSV data loading from: {fixtures_path}')
        )

        # Load data in order (dependencies first)
        try:
            if clear_data:
                self.clear_all_data()
            
            self.load_companies_and_vendors(fixtures_path)
            self.load_items(fixtures_path)
            self.load_purchase_orders(fixtures_path)
            self.load_goods_received(fixtures_path)
            self.load_invoices(fixtures_path)

            self.stdout.write(
                self.style.SUCCESS('Successfully loaded all CSV data!')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error loading CSV data: {e}')
            )
            raise

    def clear_all_data(self):
        """Clear all existing data from tables in the correct order (respecting foreign keys)."""
        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        
        # Delete in reverse dependency order to avoid foreign key constraint errors
        deleted_counts = {}
        
        # Delete line items first
        deleted_counts['InvoiceLineItem'] = InvoiceLineItem.objects.all().delete()[0]
        deleted_counts['GoodsReceivedLineItem'] = GoodsReceivedLineItem.objects.all().delete()[0]
        deleted_counts['PurchaseOrderLineItem'] = PurchaseOrderLineItem.objects.all().delete()[0]
        
        # Delete main records
        deleted_counts['Invoice'] = Invoice.objects.all().delete()[0]
        deleted_counts['GoodsReceived'] = GoodsReceived.objects.all().delete()[0]
        deleted_counts['PurchaseOrder'] = PurchaseOrder.objects.all().delete()[0]
        
        # Delete reference data
        deleted_counts['Item'] = Item.objects.all().delete()[0]
        deleted_counts['Vendor'] = Vendor.objects.all().delete()[0]
        deleted_counts['Company'] = Company.objects.all().delete()[0]
        
        self.stdout.write('Cleared existing data:')
        for model, count in deleted_counts.items():
            if count > 0:
                self.stdout.write(f'  - {model}: {count} records deleted')

    def load_companies_and_vendors(self, fixtures_path):
        """Load companies and vendors from CSV files."""
        self.stdout.write('Loading companies and vendors...')
        
        companies = set()
        vendors = set()
        
        # Extract companies and vendors from all CSV files
        for csv_file in ['invoices.csv', 'purchase-orders.csv', 'goods-received.csv']:
            csv_path = os.path.join(fixtures_path, csv_file)
            if os.path.exists(csv_path):
                with open(csv_path, 'r') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        if 'Company_ID' in row and 'Company_Name' in row:
                            companies.add((row['Company_ID'], row['Company_Name']))
                        if 'Vendor_ID' in row and 'Vendor_Name' in row:
                            vendors.add((row['Vendor_ID'], row['Vendor_Name']))

        # Create companies
        companies_created = 0
        for company_id, company_name in companies:
            company, created = Company.objects.get_or_create(
                company_id=company_id,
                defaults={'name': company_name}
            )
            if created:
                companies_created += 1

        # Create vendors
        vendors_created = 0
        for vendor_id, vendor_name in vendors:
            vendor, created = Vendor.objects.get_or_create(
                vendor_id=vendor_id,
                defaults={'name': vendor_name}
            )
            if created:
                vendors_created += 1

        self.stdout.write(f'Created {companies_created} new companies and {vendors_created} new vendors')

    def load_items(self, fixtures_path):
        """Load items from CSV files."""
        self.stdout.write('Loading items...')
        
        items = set()
        
        # Extract items from all CSV files
        for csv_file in ['invoices.csv', 'purchase-orders.csv', 'goods-received.csv']:
            csv_path = os.path.join(fixtures_path, csv_file)
            if os.path.exists(csv_path):
                with open(csv_path, 'r') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        if 'Item_Code' in row and 'Description' in row:
                            items.add((row['Item_Code'], row['Description']))

        # Create items
        items_created = 0
        for item_code, description in items:
            item, created = Item.objects.get_or_create(
                item_code=item_code,
                defaults={'description': description}
            )
            if created:
                items_created += 1

        self.stdout.write(f'Created {items_created} new items')

    def load_purchase_orders(self, fixtures_path):
        """Load purchase orders from CSV."""
        csv_path = os.path.join(fixtures_path, 'purchase-orders.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('purchase-orders.csv not found, skipping...')
            return

        self.stdout.write('Loading purchase orders...')
        
        pos_created = 0
        line_items_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                po_number = row['PO_Number']
                
                # Create PO if it doesn't exist
                try:
                    vendor = Vendor.objects.get(vendor_id=row['Vendor_ID'])
                    company = Company.objects.get(company_id=row['Company_ID'])
                    
                    po, created = PurchaseOrder.objects.get_or_create(
                        po_number=po_number,
                        defaults={
                            'date': datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                            'required_delivery_date': datetime.strptime(row['Required_Delivery_Date'], '%Y-%m-%d').date(),
                            'vendor': vendor,
                            'company': company,
                            'currency': row['Currency'],
                            'status': row['PO_Status'].upper()
                        }
                    )
                    
                    if created:
                        pos_created += 1

                    # Create line item if it doesn't exist
                    item = Item.objects.get(item_code=row['Item_Code'])
                    
                    line_item, created = PurchaseOrderLineItem.objects.get_or_create(
                        purchase_order=po,
                        item=item,
                        defaults={
                            'quantity': Decimal(row['Quantity']),
                            'unit_price': Decimal(row['Unit_Price']),
                            'total': Decimal(row['Total'])
                        }
                    )
                    
                    if created:
                        line_items_created += 1
                        
                except (Vendor.DoesNotExist, Company.DoesNotExist, Item.DoesNotExist) as e:
                    self.stdout.write(f'Skipping PO {po_number}: {e}')
                    continue

        self.stdout.write(f'Created {pos_created} purchase orders with {line_items_created} line items')

    def load_goods_received(self, fixtures_path):
        """Load goods received from CSV."""
        csv_path = os.path.join(fixtures_path, 'goods-received.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('goods-received.csv not found, skipping...')
            return

        self.stdout.write('Loading goods received...')
        
        grs_created = 0
        line_items_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                gr_number = row['GR_Number']
                
                try:
                    vendor = Vendor.objects.get(vendor_id=row['Vendor_ID'])
                    company = Company.objects.get(company_id=row['Company_ID'])
                    
                    # Get PO if exists
                    po = None
                    if row.get('PO_Number'):
                        try:
                            po = PurchaseOrder.objects.get(po_number=row['PO_Number'])
                        except PurchaseOrder.DoesNotExist:
                            pass
                    
                    gr, created = GoodsReceived.objects.get_or_create(
                        gr_number=gr_number,
                        defaults={
                            'date': datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                            'purchase_order': po,
                            'vendor': vendor,
                            'company': company,
                            'notes': row.get('Notes', '')
                        }
                    )
                    
                    if created:
                        grs_created += 1

                    # Create line item if it doesn't exist
                    item = Item.objects.get(item_code=row['Item_Code'])
                    
                    line_item, created = GoodsReceivedLineItem.objects.get_or_create(
                        goods_received=gr,
                        item=item,
                        defaults={
                            'quantity_ordered': Decimal(row['Quantity_Ordered']),
                            'quantity_received': Decimal(row['Quantity_Received']),
                            'notes': row.get('Notes', '')
                        }
                    )
                    
                    if created:
                        line_items_created += 1
                        
                except (Vendor.DoesNotExist, Company.DoesNotExist, Item.DoesNotExist) as e:
                    self.stdout.write(f'Skipping GR {gr_number}: {e}')
                    continue

        self.stdout.write(f'Created {grs_created} goods received with {line_items_created} line items')

    def load_invoices(self, fixtures_path):
        """Load invoices from CSV."""
        csv_path = os.path.join(fixtures_path, 'invoices.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('invoices.csv not found, skipping...')
            return

        self.stdout.write('Loading invoices...')
        
        invoices_created = 0
        line_items_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                invoice_number = row['Invoice_Number']
                
                try:
                    vendor = Vendor.objects.get(vendor_id=row['Vendor_ID'])
                    company = Company.objects.get(company_id=row['Company_ID'])
                    
                    invoice, created = Invoice.objects.get_or_create(
                        invoice_number=invoice_number,
                        defaults={
                            'date': datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                            'due_date': datetime.strptime(row['Due_Date'], '%Y-%m-%d').date(),
                            'po_number': row.get('PO_Number', ''),
                            'gr_number': row.get('GR_Number', ''),
                            'vendor': vendor,
                            'company': company,
                            'currency': row['Currency'],
                            'payment_terms': row['Payment_Terms'],
                            'shipping': Decimal(row.get('Shipping', '0'))
                        }
                    )
                    
                    if created:
                        invoices_created += 1

                    # Create line item if it doesn't exist
                    item = Item.objects.get(item_code=row['Item_Code'])
                    
                    line_item, created = InvoiceLineItem.objects.get_or_create(
                        invoice=invoice,
                        item=item,
                        defaults={
                            'quantity': Decimal(row['Quantity']),
                            'unit_price': Decimal(row['Unit_Price']),
                            'total': Decimal(row['Total']),
                            'discount_percent': Decimal(row.get('Discount_Percent', '0')),
                            'discount_amount': Decimal(row.get('Discount_Amount', '0')),
                            'tax_rate': Decimal(row.get('Tax_Rate', '0'))
                        }
                    )
                    
                    if created:
                        line_items_created += 1
                        
                except (Vendor.DoesNotExist, Company.DoesNotExist, Item.DoesNotExist) as e:
                    self.stdout.write(f'Skipping Invoice {invoice_number}: {e}')
                    continue

        self.stdout.write(f'Created {invoices_created} invoices with {line_items_created} line items') 