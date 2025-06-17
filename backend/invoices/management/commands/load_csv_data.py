import csv
import os
from decimal import Decimal
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth.models import User
from invoices.models import Company, Vendor, Item, Invoice, InvoiceLineItem, UserProfile, AssignmentRule, AssignmentRuleUser
from purchase_orders.models import PurchaseOrder, PurchaseOrderLineItem
from goods_received.models import GoodsReceived, GoodsReceivedLineItem


class Command(BaseCommand):
    help = 'Load data from CSV files into the database (always clears existing data first)'

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

        self.stdout.write(
            self.style.SUCCESS(f'Starting CSV data loading from: {fixtures_path}')
        )

        # Load data in order (dependencies first)
        try:
            # Always clear existing data first
            self.clear_all_data()
            
            self.load_users(fixtures_path)
            self.load_companies_and_vendors(fixtures_path)
            self.load_items(fixtures_path)
            self.load_purchase_orders(fixtures_path)
            self.load_goods_received(fixtures_path)
            self.load_invoices(fixtures_path)
            self.load_assignment_rules(fixtures_path)

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
        
        # Delete assignment rules first (they reference users)
        deleted_counts['AssignmentRuleUser'] = AssignmentRuleUser.objects.all().delete()[0]
        deleted_counts['AssignmentRule'] = AssignmentRule.objects.all().delete()[0]
        
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
        
        # Delete non-staff/admin users and their profiles (preserve admin/staff accounts)
        non_admin_users = User.objects.filter(is_staff=False, is_superuser=False)
        deleted_counts['UserProfile'] = UserProfile.objects.filter(user__in=non_admin_users).delete()[0]
        deleted_counts['User'] = non_admin_users.delete()[0]
        
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
                            'status': row['PO_Status'].upper(),
                            'payment_terms': row.get('Payment_Terms', '')
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
                    
                    # Get assigned user if specified
                    assigned_to = None
                    if row.get('Assigned_To'):
                        try:
                            assigned_to = User.objects.get(username=row['Assigned_To'])
                        except User.DoesNotExist:
                            self.stdout.write(f'Warning: User {row["Assigned_To"]} not found for invoice {invoice_number}')
                    
                    invoice, created = Invoice.objects.get_or_create(
                        invoice_number=invoice_number,
                        defaults={
                            'date': datetime.strptime(row['Date'], '%Y-%m-%d').date(),
                            'due_date': datetime.strptime(row['Due_Date'], '%Y-%m-%d').date(),
                            'po_number': row.get('PO_Number', ''),
                            'gr_number': row.get('GR_Number', ''),
                            'vendor': vendor,
                            'company': company,
                            'assigned_to': assigned_to,
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

    def load_users(self, fixtures_path):
        """Load users from CSV file."""
        csv_path = os.path.join(fixtures_path, 'users.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('users.csv not found, skipping user creation...')
            return

        self.stdout.write('Loading users...')
        
        users_created = 0
        profiles_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                username = row['username']
                email = row['email']
                first_name = row['first_name']
                last_name = row['last_name']
                department = row['department']
                is_staff = row['is_staff'].lower() in ['true', '1', 'yes']
                is_active = row['is_active'].lower() in ['true', '1', 'yes']
                
                try:
                    # Create user with default password
                    user, created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            'email': email,
                            'first_name': first_name,
                            'last_name': last_name,
                            'is_staff': is_staff,
                            'is_active': is_active,
                        }
                    )
                    
                    if created:
                        # Set default password (username for simplicity in POC)
                        user.set_password(username)
                        user.save()
                        users_created += 1
                    
                    # Create or update user profile
                    profile, profile_created = UserProfile.objects.get_or_create(
                        user=user,
                        defaults={'department': department}
                    )
                    
                    if profile_created:
                        profiles_created += 1
                    elif profile.department != department:
                        profile.department = department
                        profile.save()
                        
                except Exception as e:
                    self.stdout.write(f'Error creating user {username}: {e}')
                    continue

        self.stdout.write(f'Created {users_created} new users with {profiles_created} new profiles')

    def load_assignment_rules(self, fixtures_path):
        """Load assignment rules from CSV file."""
        csv_path = os.path.join(fixtures_path, 'assignment_rules.csv')
        if not os.path.exists(csv_path):
            self.stdout.write('assignment_rules.csv not found, skipping assignment rules...')
            return

        self.stdout.write('Loading assignment rules...')
        
        rules_created = 0

        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                name = row['name']
                rule = row['rule']
                function_assignees = row['function_assignees']
                user_ruleset = row['user_ruleset']
                priority = int(row['priority'])
                is_active = row['is_active'].lower() in ['true', '1', 'yes']
                
                try:
                    assignment_rule, created = AssignmentRule.objects.get_or_create(
                        name=name,
                        defaults={
                            'rule': rule,
                            'function_assignees': function_assignees,
                            'user_ruleset': user_ruleset,
                            'priority': priority,
                            'is_active': is_active
                        }
                    )
                    
                    if created:
                        rules_created += 1
                        
                        # For demonstration, add some users to IT rules
                        if function_assignees == 'IT':
                            it_users = User.objects.filter(profile__department='IT', is_active=True)
                            for i, user in enumerate(it_users[:3], 1):  # First 3 IT users
                                AssignmentRuleUser.objects.create(
                                    assignment_rule=assignment_rule,
                                    user=user,
                                    priority=i
                                )
                        
                        # Add users to Operations rules
                        elif function_assignees == 'Operations':
                            ops_users = User.objects.filter(profile__department='Operations', is_active=True)
                            for i, user in enumerate(ops_users[:3], 1):  # First 3 Operations users
                                AssignmentRuleUser.objects.create(
                                    assignment_rule=assignment_rule,
                                    user=user,
                                    priority=i
                                )
                        
                        # Add users to Finance rules  
                        elif function_assignees == 'Finance':
                            finance_users = User.objects.filter(profile__department='Finance', is_active=True)
                            for i, user in enumerate(finance_users[:2], 1):  # First 2 Finance users
                                AssignmentRuleUser.objects.create(
                                    assignment_rule=assignment_rule,
                                    user=user,
                                    priority=i
                                )
                        
                except Exception as e:
                    self.stdout.write(f'Error creating assignment rule {name}: {e}')
                    continue

        self.stdout.write(f'Created {rules_created} assignment rules') 