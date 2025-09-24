#!/bin/bash

# Start API Server for GitHub Codespaces
echo "🚀 Starting Ubicomp Demo API Server..."

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "📦 Running in GitHub Codespaces"
    echo "🌐 Your API will be available at: https://$CODESPACE_NAME-8089.preview.app.github.dev"
    echo "📊 API Documentation: https://$CODESPACE_NAME-8089.preview.app.github.dev/docs"
else
    echo "💻 Running locally"
    echo "🌐 Your API will be available at: http://localhost:8089"
    echo "📊 API Documentation: http://localhost:8089/docs"
fi

# Set environment variables for Codespaces
export HOST=0.0.0.0
export PORT=8089

# Start the API server
python -m scripts.api_server
