#!/bin/bash
# Development startup script for Invoice Processing POC
# This script will automatically set up and start the entire development environment

echo "🚀 Starting Invoice Processing POC Development Environment"
echo "This will automatically set up everything you need..."
echo ""

# Kill any existing processes
echo "🧹 Cleaning up any existing processes..."
pkill -f "python.*manage.py.*runserver" || true
pkill -f "npm.*run.*dev" || true
pkill -f "pnpm.*dev" || true
sleep 2

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ ERROR: Python is not installed. Please install Python 3.11+ first."
    echo "   Visit: https://www.python.org/downloads/"
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Python and Node.js are installed"
echo ""

# Set up backend
echo "🔧 Setting up Django backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to install Python dependencies"
    exit 1
fi
echo "✅ Python dependencies installed"

# Run Django migrations
echo "🗄️  Setting up database..."
python manage.py migrate
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to run database migrations"
    exit 1
fi
echo "✅ Database set up complete"

# Collect static files (suppress output)
python manage.py collectstatic --noinput > /dev/null 2>&1 || true

# Start Django server in background
echo "🚀 Starting Django backend server on port 8000..."
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Wait for Django to start
echo "⏳ Waiting for Django server to start..."
sleep 5

# Check if Django is running
echo "🔍 Checking Django server status..."
for i in {1..10}; do
    if curl -s http://localhost:8000/api/health/ > /dev/null 2>&1; then
        echo "✅ Django backend server is running!"
        break
    else
        if [ $i -eq 10 ]; then
            echo "❌ ERROR: Django server failed to start after 10 attempts"
            echo "Check the terminal output above for error details"
            kill $DJANGO_PID 2>/dev/null
            exit 1
        fi
        echo "   Still waiting... ($i/10)"
        sleep 2
    fi
done

# Set up frontend
echo ""
echo "🎨 Setting up Next.js frontend..."
cd ../frontend

# Check if package manager is available (prefer pnpm, fallback to npm)
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
    INSTALL_CMD="pnpm install"
    DEV_CMD="pnpm dev"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    INSTALL_CMD="npm install"
    DEV_CMD="npm run dev"
else
    echo "❌ ERROR: No package manager found (npm or pnpm)"
    kill $DJANGO_PID 2>/dev/null
    exit 1
fi

echo "📦 Using $PKG_MANAGER as package manager"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ] && [ ! -f "pnpm-lock.yaml" ]; then
    echo "📥 Installing frontend dependencies..."
    $INSTALL_CMD
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to install frontend dependencies"
        kill $DJANGO_PID 2>/dev/null
        exit 1
    fi
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Frontend dependencies already installed"
fi

# Start Next.js development server
echo "🚀 Starting Next.js frontend on port 3000..."
$DEV_CMD &
NEXTJS_PID=$!

# Wait a moment for Next.js to start
sleep 3

echo ""
echo "🎉 Development environment started successfully!"
echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  🌐 Your application is now running:    │"
echo "│                                         │"
echo "│  📱 Frontend:  http://localhost:3000   │"
echo "│  🔧 Backend:   http://localhost:8000   │"
echo "│  👤 Admin:     http://localhost:8000/admin/ │"
echo "└─────────────────────────────────────────┘"
echo ""
echo "💡 Tips:"
echo "   • The frontend will automatically reload when you make changes"
echo "   • The backend will restart when you modify Python files"
echo "   • Press Ctrl+C to stop both servers"
echo ""
echo "🔧 Debugging:"
echo "   • Backend logs: Check this terminal"
echo "   • Frontend logs: Check your browser's developer console"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $DJANGO_PID $NEXTJS_PID 2>/dev/null
    echo "✅ Servers stopped. Have a great day!"
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

# Keep script running and wait for user interrupt
echo "👀 Watching for changes... (Press Ctrl+C to stop)"
wait 