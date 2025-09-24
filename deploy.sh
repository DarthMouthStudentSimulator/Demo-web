#!/bin/bash

# GitHub Pages Deployment Script
# This script helps deploy the project to GitHub Pages

echo "🚀 Starting GitHub Pages deployment..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

# Check if gh-pages is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd web
npm install
cd ..

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to GitHub Pages
echo "🚀 Deploying to GitHub Pages..."
npm run deploy

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\)\/\([^/]*\)\.git/\1.github.io\/\2/')/Deploy/"
