# Invoice Processing POC

A modern invoice processing application that extracts data from invoices using AI and provides a clean user interface for managing the workflow.

## Project Overview

This proof of concept application demonstrates a modern approach to invoice processing with:

- AI-powered invoice data extraction
- Clean, responsive interface for managing invoices
- Seamless integration between Next.js frontend and Django backend

## Architecture

The project follows a modern full-stack architecture:

### Frontend

- **Next.js**: React framework for the user interface
- **TypeScript**: For type-safe code
- **Tailwind CSS**: For styling
- **ShadcnUI**: Component library

### Backend

- **Django**: Python web framework with Django REST Framework
- **AI Engineering**: Modular AI services for invoice extraction
  - **Anthropic Claude**: AI models for extracting data from invoice images
  - **AWS Bedrock**: Alternative AI service
- **PyMuPDF**: PDF processing
- **PostgreSQL/SQLite**: Database for storing invoices and extraction jobs

## Features

- Upload invoice files (PDF, images, CSV)
- Extract invoice data using AI
- Preview invoice files
- Create/edit invoices
- Dashboard for invoice management
- Purchase order and goods received tracking
- Invoice validation and approval workflow

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.11+
- API keys for Claude/Anthropic or AWS (optional for demo mode)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/xelixdev/invoice-processing-poc.git
   cd invoice-processing-poc
   ```

2. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   # or
   pnpm install
   ```

3. Set up backend:

   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Set up Django:

   ```bash
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py createsuperuser  # Optional
   ```

5. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Add your API keys (optional):
     ```
     SECRET_KEY=your_django_secret_key
     ANTHROPIC_API_KEY=your_api_key_here
     AWS_ACCESS_KEY_ID=your_aws_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret
     ```

### Running the Application

Use the included start script to run both the frontend and backend:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

This will start:

- Django backend on port 8000
- Next.js frontend on port 3000

### Manual Development

Alternatively, you can run each part manually:

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Development

### Project Structure

```
invoice-processing-poc/
├── frontend/             # Next.js frontend
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── ...
├── backend/              # Django backend
│   ├── ai_engineering/   # AI services and extraction logic
│   ├── invoices/         # Invoice management app
│   ├── invoice_extraction/ # AI extraction job management
│   ├── purchase_orders/  # Purchase order management
│   ├── goods_received/   # Goods received management
│   └── manage.py         # Django management
├── start-dev.sh          # Development startup script
└── README.md
```

### Adding New Features

1. Backend changes: Add Django apps, models, views, and API endpoints
2. AI changes: Modify modules in `backend/ai_engineering/`
3. Frontend changes: Modify components or add new pages in the `frontend/app/` directory

## License

MIT

## Acknowledgments

- Created by xelixdev
