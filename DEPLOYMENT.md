# GitHub Pages Deployment Guide

This guide will help you deploy your Ubicomp Demo project to GitHub Pages.

## Prerequisites

1. A GitHub repository
2. Node.js 16+ installed
3. Git configured

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for GitHub Pages deployment"
git push origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "GitHub Actions"
5. Save the settings

### 3. Configure API Server

Since GitHub Pages only serves static files, you'll need to deploy your API server separately. Options:

**Option A: Deploy API to Heroku**
1. Create a Heroku account
2. Install Heroku CLI
3. Create a new Heroku app
4. Deploy your Python API server to Heroku
5. Update the API URL in `web/src/api.ts`

**Option B: Use a different hosting service**
- Railway, Render, or similar platforms
- Update the API URL accordingly

**Option C: Use GitHub Codespaces (for demo purposes)**
- Run the API server in a Codespace
- Use the Codespace URL as your API base

### 4. Update API Configuration

Edit `web/src/api.ts` and replace the placeholder URL:

```typescript
const API_BASE = (import.meta as any).env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://127.0.0.1:8089" 
    : "https://your-actual-api-server.herokuapp.com"); // Replace with your actual API server URL
```

### 5. Deploy

The deployment will happen automatically when you push to the main branch thanks to the GitHub Actions workflow.

**Manual deployment (alternative):**

```bash
# Install dependencies
npm install
cd web
npm install
cd ..

# Build and deploy
npm run deploy
```

### 6. Access Your Site

Your site will be available at:
`https://yourusername.github.io/Deploy/`

## Environment Variables

Create a `.env` file in the `web` directory for local development:

```bash
# web/.env
VITE_API_BASE=http://127.0.0.1:8089
```

## Troubleshooting

### Common Issues

1. **404 on refresh**: This is normal for SPA routing. GitHub Pages doesn't support client-side routing by default.

2. **API not working**: Make sure your API server is deployed and accessible from the internet.

3. **Build fails**: Check the GitHub Actions logs for specific error messages.

### Local Testing

Test your build locally before deploying:

```bash
cd web
npm run build
npm run preview
```

## File Structure

```
Deploy/
├── .github/workflows/deploy.yml  # GitHub Actions workflow
├── web/
│   ├── dist/                     # Built files (generated)
│   ├── src/api.ts               # API configuration
│   └── vite.config.ts           # Vite configuration
├── package.json                 # Root package.json with deploy scripts
└── DEPLOYMENT.md               # This file
```

## Notes

- The base path is set to `/Deploy/` in `vite.config.ts`
- If your repository name is different, update the `base` path accordingly
- The GitHub Actions workflow will automatically deploy on every push to main/master branch
