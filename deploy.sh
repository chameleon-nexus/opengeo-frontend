#!/bin/bash
# Frontend deployment script

set -e

echo "Starting Frontend deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found, using default configuration"
    echo "VITE_API_BASE_URL=http://47.99.191.166:8001" > .env
fi

# Stop old containers
echo "Stopping old containers..."
docker-compose down

# Build and start
echo "Building and starting services..."
docker-compose up -d --build

# Check service status
echo "Checking service status..."
docker-compose ps

echo "Frontend deployment completed!"
echo "View logs: docker-compose logs -f"
