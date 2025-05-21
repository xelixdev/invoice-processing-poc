#!/bin/bash

# Kill any existing uvicorn processes (only if they're running our FastAPI app)
echo "Checking for existing FastAPI processes..."
pkill -f "uvicorn api:app" || true

# Clear the terminal
clear

# Start the FastAPI server
echo "Starting Python FastAPI server on port 8000..."
cd backend

# Check if Python dependencies are installed
echo "Checking Python dependencies..."
pip install -r requirements.txt

# Start the FastAPI server in the background
echo "Starting FastAPI server at http://localhost:8000"
python -m uvicorn api:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!

# Wait for the FastAPI server to start
echo "Waiting for FastAPI server to start... (PID: $PYTHON_PID)"
sleep 3

# Verify the server is running
echo "Checking if FastAPI server is running..."
for i in {1..5}; do
  if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ FastAPI server is running!"
    break
  fi
  
  if [ $i -eq 5 ]; then
    echo "❌ ERROR: Failed to start FastAPI server after 5 attempts."
    echo "Check logs above for errors."
    kill $PYTHON_PID 2>/dev/null
    exit 1
  fi
  
  echo "Waiting for server to start (attempt $i/5)..."
  sleep 2
done

# Start the Next.js frontend
echo "Starting Next.js frontend..."
cd ..
pnpm dev

# When the user interrupts with Ctrl+C, kill the Python process too
trap "echo 'Shutting down servers...'; kill $PYTHON_PID 2>/dev/null; echo 'Done.'; exit" INT TERM EXIT 