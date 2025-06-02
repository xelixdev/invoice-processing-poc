# Invoice Processing Backend

A Django REST Framework backend for invoice processing with AI-powered extraction capabilities.

## Features

- **Invoice Management**: Complete CRUD operations for invoices with line items
- **Purchase Orders**: Track and manage purchase orders
- **Goods Received**: Record goods received against purchase orders
- **AI Invoice Extraction**: Extract invoice data from PDFs, images, and CSV files using Anthropic Claude or AWS Bedrock
- **RESTful API**: Full REST API with filtering, searching, and pagination
- **Database Models**: Comprehensive data models with relationships and validation

## Tech Stack

- **Django 5.0.1**: Web framework
- **Django REST Framework**: API framework
- **PostgreSQL**: Production database (SQLite for development)
- **Anthropic Claude**: AI invoice extraction
- **AWS Bedrock**: Alternative AI service
- **Celery**: Background task processing
- **Redis**: Caching and task queue

## API Endpoints

### Core Resources

- `GET /api/companies/` - List companies
- `GET /api/vendors/` - List vendors
- `GET /api/items/` - List items/products
- `GET /api/invoices/` - List invoices with line items
- `GET /api/purchase-orders/` - List purchase orders
- `GET /api/goods-received/` - List goods received

### Invoice Extraction

- `POST /api/extract-invoice/` - Upload and extract invoice data
- `GET /api/extraction-jobs/` - List extraction jobs
- `GET /api/extracted-invoices/` - List extracted invoice data

### Health Check

- `GET /api/health/` - Health check endpoint

## Setup

### Local Development

1. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables** (create `.env` file):

   ```env
   SECRET_KEY=your-secret-key
   DEBUG=True
   ANTHROPIC_API_KEY=your-anthropic-key  # Optional
   AWS_ACCESS_KEY_ID=your-aws-key        # Optional
   AWS_SECRET_ACCESS_KEY=your-aws-secret # Optional
   AWS_DEFAULT_REGION=us-east-1          # Optional
   ```

3. **Run migrations**:

   ```bash
   python manage.py migrate
   ```

4. **Load sample data**:

   ```bash
   python manage.py load_csv_data
   ```

5. **Start development server**:
   ```bash
   python manage.py runserver 8000
   ```

### Production Deployment (Railway)

1. **Connect your repository** to Railway
2. **Set environment variables**:

   - `SECRET_KEY`: Django secret key
   - `DEBUG`: False
   - `ALLOWED_HOSTS`: your-domain.railway.app
   - `DATABASE_URL`: (automatically provided by Railway PostgreSQL)
   - `ANTHROPIC_API_KEY`: (optional)
   - `AWS_ACCESS_KEY_ID`: (optional)
   - `AWS_SECRET_ACCESS_KEY`: (optional)

3. **Deploy**: Railway will automatically deploy using the `railway.json` configuration

## Data Models

### Core Models

- **Company**: Client companies
- **Vendor**: Supplier companies
- **Item**: Products/services
- **Invoice**: Invoice headers with line items
- **PurchaseOrder**: Purchase orders with line items
- **GoodsReceived**: Goods received records

### Extraction Models

- **InvoiceExtractionJob**: Track extraction jobs
- **ExtractedInvoice**: Raw extracted invoice data
- **ExtractedLineItem**: Extracted line item data

## Invoice Extraction

The system supports multiple file types:

- **PDF**: Converted to images and processed with AI
- **Images**: JPG, JPEG, PNG processed directly
- **CSV**: Parsed directly without AI

### AI Services

1. **Anthropic Claude**: Primary AI service (requires API key)
2. **AWS Bedrock**: Alternative AI service (requires AWS credentials)
3. **Mock Service**: Returns demo data when no AI services are configured

## Management Commands

- `python manage.py load_csv_data`: Load sample data from CSV files
- `python manage.py migrate`: Run database migrations
- `python manage.py collectstatic`: Collect static files for production

## API Usage Examples

### Get all invoices

```bash
curl http://localhost:8000/api/invoices/
```

### Extract invoice from file

```bash
curl -X POST -F "file=@invoice.pdf" http://localhost:8000/api/extract-invoice/
```

### Filter invoices by vendor

```bash
curl "http://localhost:8000/api/invoices/?vendor=1"
```

### Search invoices

```bash
curl "http://localhost:8000/api/invoices/?search=INV-2025"
```

## Development

### Adding New Features

1. Create models in appropriate app
2. Create serializers for API representation
3. Create viewsets for API endpoints
4. Register viewsets in main URLs
5. Run migrations

### Testing

```bash
python manage.py test
```

### Code Style

Follow Django coding conventions and PEP 8 guidelines.

## License

MIT License
