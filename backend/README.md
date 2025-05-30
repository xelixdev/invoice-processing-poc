# Invoice Processing Backend API

FastAPI backend service for invoice extraction using AI.

## Features

- Invoice extraction from PDF, JPG, PNG, and CSV files
- Support for Anthropic Claude and AWS Bedrock
- RESTful API endpoints
- CORS enabled for frontend communication

## API Endpoints

- `POST /extract-invoice` - Extract invoice data from uploaded file
- `GET /health` - Health check endpoint

## Environment Variables

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
PORT=8000
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

## Local Development

```bash
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

## Railway Deployment

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

The service will be available at: `https://your-service.railway.app`
