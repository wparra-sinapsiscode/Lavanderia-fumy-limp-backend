#!/bin/bash

# Run Fumy Limp API Tests
echo "Running Fumy Limp API tests..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js before running tests."
    exit 1
fi

# Check if required packages are installed
if [ ! -d "node_modules/axios" ] || [ ! -d "node_modules/dotenv" ]; then
    echo "Installing required packages..."
    npm install axios dotenv
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
fi

# Run the test script
node test-api.js

# Exit with the same status as the test script
exit $?