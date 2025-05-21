#!/bin/bash

# Install dependencies if needed
echo "Installing Python dependencies..."
pip install -r requirements.txt
 
# Start the FastAPI server
echo "Starting FastAPI server at http://localhost:8001"
uvicorn api:app --reload --host 0.0.0.0 --port 8001 