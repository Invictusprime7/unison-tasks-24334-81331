#!/bin/bash

# Auto-update Vercel Environment Variables and Deploy
# This script reads .env, updates Vercel environment variables, and deploys

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Auto-deploy to Vercel with environment sync${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create a .env file with your Supabase credentials"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

echo -e "${GREEN}📋 Environment variables loaded${NC}"

# Validate required variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ Missing required Supabase environment variables!${NC}"
    echo "Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY"
    exit 1
fi

echo -e "${YELLOW}🔧 Updating Vercel environment variables...${NC}"

# Function to update environment variable for production
update_production_env() {
    local var_name=$1
    local var_value=$2
    
    # Remove existing variable if it exists
    printf "yes\n" | vercel env rm "$var_name" production > /dev/null 2>&1 || true
    
    # Add new value
    if echo "$var_value" | vercel env add "$var_name" production > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Updated $var_name${NC}"
    else
        echo -e "${RED}❌ Failed to update $var_name${NC}"
    fi
}

# Update production environment variables
update_production_env "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL"
update_production_env "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_PUBLISHABLE_KEY"
update_production_env "VITE_SUPABASE_PROJECT_ID" "$VITE_SUPABASE_PROJECT_ID"
update_production_env "NODE_ENV" "production"
update_production_env "VITE_AI_ENABLED" "true"

echo ""
echo -e "${YELLOW}📦 Building project...${NC}"

# Build the project
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"

# Deploy to Vercel
if vercel --prod; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${BLUE}Your app is now live with updated environment variables${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi