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

    def handle(self, *args, **options):
        fixtures_dir = options['fixtures_dir']
        base_dir = settings.BASE_DIR
        fixtures_path = os.path.join(base_dir, fixtures_dir)

        if not os.path.exists(fixtures_path):
            self.stdout.write(
                self.style.ERROR(f'Fixtures directory not found: {fixtures_path}')
            )
            return

        # Load data in order (dependencies first)
        self.load_companies_and_vendors(fixtures_path)
        self.load_items(fixtures_path)
        self.load_purchase_orders(fixtures_path)
        self.load_goods_received(fixtures_path)
        self.load_invoices(fixtures_path)

        self.stdout.write(
            self.style.SUCCESS('Successfully loaded all CSV data!')
        )

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
        for company_id, company_name in companies:
            Company.objects.get_or_create(
                company_id=company_id,
                defaults={'name': company_name}
            )

        # Create vendors
        for vendor_id, vendor_name in vendors:
            Vendor.objects.get_or_create(
                vendor_id=vendor_id,
                defaults={'name': vendor_name}
            )

        self.stdout.write(f'Created {len(companies)} companies and {len(vendors)} vendors')

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
        for item_code, description in items:
            Item.objects.get_or_create(
                item_code=item_code,
                defaults={'description': description}
            )

        self.stdout.write(f'Created {len(items)} items')

    def load_purchase_orders(self, fixtures_path):
        """Load purchase orders from CSV."""
        csv_path = os.path.join(fixtures_path, 'purchase-orders.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('purchase-orders.csv not found, skipping...')
            return

        self.stdout.write('Loading purchase orders...')
        
        pos_created = {}
        line_items_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                po_number = row['PO_Number']
                
                # Create PO if it doesn't exist
                if po_number not in pos_created:
                    vendor = Vendor.objects.get(vendor_id=row['Vendor_ID'])
                    company = Company.objects.get(company_id=row['Company_ID'])
                    
                    po = PurchaseOrder.objects.create(
                        po_number=po_number,
                        date=datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                        required_delivery_date=datetime.strptime(row['Required_Delivery_Date'], '%Y-%m-%d').date(),
                        vendor=vendor,
                        company=company,
                        currency=row['Currency'],
                        status=row['PO_Status'].upper()
                    )
                    pos_created[po_number] = po

                # Create line item
                po = pos_created[po_number]
                item = Item.objects.get(item_code=row['Item_Code'])
                
                PurchaseOrderLineItem.objects.create(
                    purchase_order=po,
                    item=item,
                    quantity=Decimal(row['Quantity']),
                    unit_price=Decimal(row['Unit_Price']),
                    total=Decimal(row['Total'])
                )
                line_items_created += 1

        self.stdout.write(f'Created {len(pos_created)} purchase orders with {line_items_created} line items')

    def load_goods_received(self, fixtures_path):
        """Load goods received from CSV."""
        csv_path = os.path.join(fixtures_path, 'goods-received.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('goods-received.csv not found, skipping...')
            return

        self.stdout.write('Loading goods received...')
        
        grs_created = {}
        line_items_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                gr_number = row['GR_Number']
                
                # Create GR if it doesn't exist
                if gr_number not in grs_created:
                    vendor = Vendor.objects.get(vendor_id=row['Vendor_ID'])
                    company = Company.objects.get(company_id=row['Company_ID'])
                    
                    # Get PO if exists
                    po = None
                    if row.get('PO_Number'):
                        try:
                            po = PurchaseOrder.objects.get(po_number=row['PO_Number'])
                        except PurchaseOrder.DoesNotExist:
                            pass
                    
                    gr = GoodsReceived.objects.create(
                        gr_number=gr_number,
                        date=datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                        purchase_order=po,
                        vendor=vendor,
                        company=company,
                        notes=row.get('Notes', '')
                    )
                    grs_created[gr_number] = gr

                # Create line item
                gr = grs_created[gr_number]
                item = Item.objects.get(item_code=row['Item_Code'])
                
                GoodsReceivedLineItem.objects.create(
                    goods_received=gr,
                    item=item,
                    quantity_ordered=Decimal(row['Quantity_Ordered']),
                    quantity_received=Decimal(row['Quantity_Received']),
                    notes=row.get('Notes', '')
                )
                line_items_created += 1

        self.stdout.write(f'Created {len(grs_created)} goods received with {line_items_created} line items')

    def load_invoices(self, fixtures_path):
        """Load invoices from CSV."""
        csv_path = os.path.join(fixtures_path, 'invoices.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('invoices.csv not found, skipping...')
            return

        self.stdout.write('Loading invoices...')
        
        invoices_created = {}
        line_items_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                invoice_number = row['Invoice_Number']
                
                # Create invoice if it doesn't exist
                if invoice_number not in invoices_created:
                    vendor = Vendor.objects.get(vendor_id=row['Vendor_ID'])
                    company = Company.objects.get(company_id=row['Company_ID'])
                    
                    invoice = Invoice.objects.create(
                        invoice_number=invoice_number,
                        date=datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                        due_date=datetime.strptime(row['Due_Date'], '%Y-%m-%d').date(),
                        po_number=row.get('PO_Number', ''),
                        gr_number=row.get('GR_Number', ''),
                        vendor=vendor,
                        company=company,
                        currency=row['Currency'],
                        payment_terms=row['Payment_Terms'],
                        shipping=Decimal(row.get('Shipping', '0'))
                    )
                    invoices_created[invoice_number] = invoice

                # Create line item
                invoice = invoices_created[invoice_number]
                item = Item.objects.get(item_code=row['Item_Code'])
                
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    item=item,
                    quantity=Decimal(row['Quantity']),
                    unit_price=Decimal(row['Unit_Price']),
                    total=Decimal(row['Total']),
                    discount_percent=Decimal(row.get('Discount_Percent', '0')),
                    discount_amount=Decimal(row.get('Discount_Amount', '0')),
                    tax_rate=Decimal(row.get('Tax_Rate', '0'))
                )
                line_items_created += 1

        self.stdout.write(f'Created {len(invoices_created)} invoices with {line_items_created} line items') 