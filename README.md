# Invoice Processing POC

A modern invoice processing application that extracts data from invoices using AI and provides a clean user interface for managing the workflow.

## Project Overview

This proof of concept application demonstrates a modern approach to invoice processing with:

- AI-powered invoice data extraction
- Clean, responsive interface for managing invoices
- Seamless integration between Next.js frontend and Python backend

## Architecture

The project follows a hybrid architecture:

### Frontend

- **Next.js**: React framework for the user interface
- **TypeScript**: For type-safe code
- **Tailwind CSS**: For styling
- **ShadcnUI**: Component library

### Backend

- **FastAPI**: Python-based API server for invoice extraction
- **OpenAI (Claude)**: AI models for extracting data from invoice images
- **PyMuPDF**: PDF processing
- **AWS Bedrock**: Alternative AI service

## Features

- Upload invoice files (PDF, images, CSV)
- Extract invoice data using AI
- Preview invoice files
- Create/edit invoices
- Dashboard for invoice management

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
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
   pnpm install
   ```

3. Install backend dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your API keys (optional):
     ```
     ANTHROPIC_API_KEY=your_api_key_here
     ```

### Running the Application

Use the included start script to run both the frontend and backend:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

This will start:

- FastAPI backend on port 8000
- Next.js frontend on port 3000

## Development

### Project Structure

```
invoice-processing-poc/
├── app/                  # Next.js app directory
│   ├── api/              # Next.js API routes
│   ├── invoices/         # Invoice pages
│   └── ...
├── backend/              # Python FastAPI backend
│   ├── api.py            # Main API endpoints
│   ├── anthropic_client.py # AI service integration
│   └── ...
├── components/           # React components
├── public/               # Static assets
└── ...
```

### Adding New Features

1. Backend changes: Add endpoints in `backend/api.py`
2. Frontend changes: Modify components or add new pages in the `app` directory

## License

MIT

## Acknowledgments

- Created by xelixdev
