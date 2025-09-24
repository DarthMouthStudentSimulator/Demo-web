# GitHub Codespaces Setup Guide

This guide will help you run the Ubicomp Demo project in GitHub Codespaces for easy deployment and testing.

## 🚀 Quick Start with Codespaces

### 1. Open in Codespaces

1. Go to your GitHub repository
2. Click the green "Code" button
3. Select "Codespaces" tab
4. Click "Create codespace on main"
5. Wait for the environment to build (2-3 minutes)

### 2. Start the Application

Once your Codespace is ready, you have several options:

#### Option A: Start Everything at Once
```bash
./start-all.sh
```

#### Option B: Start Components Separately

**Start API Server:**
```bash
./start-api.sh
```

**Start Web Frontend (in a new terminal):**
```bash
./start-web.sh
```

### 3. Access Your Application

After starting the servers, you'll see URLs like:
- **Web App**: `https://your-codespace-name-5173.preview.app.github.dev`
- **API Server**: `https://your-codespace-name-8089.preview.app.github.dev`
- **API Documentation**: `https://your-codespace-name-8089.preview.app.github.dev/docs`

## 🔧 Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
cd web
npm install
cd ..
```

### 2. Start API Server
```bash
# Set environment variables for Codespaces
export HOST=0.0.0.0
export PORT=8089

# Start the server
python -m scripts.api_server
```

### 3. Start Web Frontend
```bash
cd web
npm run dev -- --host 0.0.0.0
```

## 🌐 Port Forwarding

GitHub Codespaces automatically forwards ports, but you can also manage them manually:

1. Go to the "Ports" tab in VS Code
2. You should see ports 8089 (API) and 5173 (Web) listed
3. Click on a port to open it in your browser
4. Set visibility to "Public" if you want to share the URLs

## 🔑 API Key Setup

The application requires a Gemini API key for the chat functionality:

1. Get your API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/models#gemini-2.0-flash)
2. Enter it in the web interface when prompted
3. Or set it as an environment variable:
   ```bash
   export GEMINI_API_KEY=your_api_key_here
   ```

## 📁 Project Structure

```
Deploy/
├── .devcontainer/           # Codespaces configuration
│   ├── devcontainer.json   # VS Code dev container config
│   └── Dockerfile          # Custom container image
├── scripts/
│   └── api_server.py       # FastAPI backend
├── web/                    # React frontend
├── start-*.sh             # Startup scripts
└── requirements.txt        # Python dependencies
```

## 🐛 Troubleshooting

### Common Issues

1. **Ports not accessible**: Check the "Ports" tab in VS Code and ensure ports are forwarded
2. **API not connecting**: Verify the API server is running on port 8089
3. **Build errors**: Run `pip install -r requirements.txt` and `cd web && npm install`
4. **Permission denied**: Run `chmod +x start-*.sh` to make scripts executable

### Debug Commands

```bash
# Check if API server is running
curl https://your-codespace-name-8089.preview.app.github.dev/api/users

# Check if web server is running
curl https://your-codespace-name-5173.preview.app.github.dev

# View API logs
python -m scripts.api_server

# View web logs
cd web && npm run dev
```

## 🔄 Updating the Application

To update your Codespace:

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Restart the services:
   ```bash
   ./start-all.sh
   ```

## 📊 Monitoring

- **API Health**: Visit `/api/users` endpoint
- **API Documentation**: Visit `/docs` endpoint
- **Web App**: The main React application
- **Logs**: Check the terminal output for both services

## 🌍 Sharing Your Demo

Once running, you can share your Codespace:

1. Make sure ports are set to "Public" visibility
2. Share the web app URL: `https://your-codespace-name-5173.preview.app.github.dev`
3. The API will be automatically accessible to the web app

## 💡 Tips

- Use `Ctrl+C` to stop the servers
- The `start-all.sh` script runs both servers and handles cleanup
- Check the VS Code terminal for detailed logs
- Use the "Ports" tab to manage port forwarding
- Codespaces automatically saves your work

## 🔗 Next Steps

After testing in Codespaces, you can:
1. Deploy the web app to GitHub Pages
2. Deploy the API to a cloud service (Heroku, Railway, etc.)
3. Update the API URL in the web app for production deployment
