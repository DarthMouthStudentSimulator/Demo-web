# Ubicomp Demo Setup Guide

## Environment Setup

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies (for web frontend)
cd web
npm install
cd ..
```

### 2. Configure API Keys

#### Option A: Environment Variables (Recommended)

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. The API key will be automatically loaded when you start the server.

#### Option B: Frontend Input

1. Start the application without setting environment variables
2. Enter your API key directly in the web interface
3. The API key will be sent with each request

### 3. Get Your Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env` file or enter it in the web interface

## Running the Application

### 1. Start the API Server

```bash
python scripts/api_server.py
```

The server will start on `http://127.0.0.1:8089`

### 2. Start the Web Frontend

```bash
cd web
npm run dev
```

The web app will be available at `http://localhost:5173` (or similar)

## Security Notes

- **Never commit your `.env` file** to version control
- **Never share your API keys** publicly
- The `.env` file is already included in `.gitignore`
- API keys are only used for making requests to Google's Gemini API

## Troubleshooting

### API Key Issues
- Make sure your API key is valid and has the correct permissions
- Check that the environment variable is set correctly
- Try the "Test" button in the web interface to verify connectivity

### Server Issues
- Ensure all dependencies are installed
- Check that port 8089 is not already in use
- Verify your Python version is 3.8 or higher

### Frontend Issues
- Make sure Node.js and npm are installed
- Try clearing the browser cache
- Check the browser console for any JavaScript errors
