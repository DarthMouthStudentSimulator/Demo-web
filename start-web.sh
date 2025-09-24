#!/bin/bash

# Start Web Frontend for GitHub Codespaces
echo "🌐 Starting Ubicomp Demo Web Frontend..."

# Check if we're in Codespaces
if [ -n "$CODESPACES" ]; then
    echo "📦 Running in GitHub Codespaces"
    echo "🌐 Your web app will be available at: https://$CODESPACE_NAME-5173.preview.app.github.dev"
else
    echo "💻 Running locally"
    echo "🌐 Your web app will be available at: http://localhost:5173"
fi

# Navigate to web directory and start the dev server
cd web
npm run dev -- --host 0.0.0.0
