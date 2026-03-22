#!/bin/bash
# Deployment Script

echo "🚀 Deploying Estif Home..."

# Pull latest code
git pull origin main

# Install dependencies
cd server
npm install --production

# Run migrations
node database/migrate.js up

# Restart application
pm2 restart estif-home

echo "✅ Deployment complete!"