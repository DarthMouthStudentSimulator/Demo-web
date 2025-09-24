#!/bin/bash

# Start both API server and Web frontend for GitHub Codespaces
echo "🚀 Starting Ubicomp Demo - Full Stack Application"

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "📦 Running in GitHub Codespaces"
    echo "🌐 API Server: https://$CODESPACE_NAME-8089.preview.app.github.dev"
    echo "🌐 Web App: https://$CODESPACE_NAME-5173.preview.app.github.dev"
    echo "📊 API Documentation: https://$CODESPACE_NAME-8089.preview.app.github.dev/docs"
else
    echo "💻 Running locally"
    echo "🌐 API Server: http://localhost:8089"
    echo "🌐 Web App: http://localhost:5173"
    echo "📊 API Documentation: http://localhost:8089/docs"
fi

# Function to handle cleanup on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $API_PID $WEB_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start API server in background
echo "🔧 Starting API server..."
export HOST=0.0.0.0
export PORT=8089
python -m scripts.api_server &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start web frontend in background
echo "🌐 Starting web frontend..."
cd web
npm run dev -- --host 0.0.0.0 &
WEB_PID=$!

# Wait for both processes
echo "✅ Both servers are starting up..."
echo "Press Ctrl+C to stop both servers"

wait $API_PID $WEB_PID
