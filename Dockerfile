# Use Python 3.11
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Install system dependencies including OpenCV requirements
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        pkg-config \
        libpq-dev \
        libgl1-mesa-glx \
        libglib2.0-0 \
        libgomp1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy project files
COPY . /app/

# Create staticfiles directory
RUN mkdir -p /app/backend/staticfiles

# Expose port
EXPOSE $PORT

# Command to run the application
# Migrations, load fixtures, collectstatic, then start server
CMD cd backend && \
    python manage.py migrate && \
    python manage.py load_csv_data && \
    python manage.py collectstatic --noinput && \
    gunicorn invoice_backend.wsgi:application --bind 0.0.0.0:$PORT 