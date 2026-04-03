#!/bin/sh
set -e

cd /app

echo "Checking for node_modules..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Installing dependencies..."
  npm install --prefer-offline --no-audit --no-fund 2>/dev/null || npm install
fi

echo "Starting Vite dev server on port 4173..."
exec npx vite --host 0.0.0.0 --port 4173
