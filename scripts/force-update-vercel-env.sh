#!/bin/bash

# Force update Vercel Environment Variables
# This script forcefully removes and re-adds environment variables

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Force updating Vercel Environment Variables...${NC}"

# Function to force update environment variable
force_update_env_var() {
    local var_name=$1
    local var_value=$2
    local environment=$3
    
    echo -e "${YELLOW}Force updating $var_name for $environment environment...${NC}"
    
    # Remove existing variable (suppress errors if it doesn't exist)
    printf "yes\n" | vercel env rm "$var_name" "$environment" > /dev/null 2>&1 || true
    
    # Add the new value
    if echo "$var_value" | vercel env add "$var_name" "$environment"; then
        echo -e "${GREEN}✅ Updated $var_name in $environment${NC}"
    else
        echo -e "${RED}❌ Failed to update $var_name in $environment${NC}"
    fi
}

# Read environment variables from .env file
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

echo -e "${GREEN}📋 Environment variables loaded from .env${NC}"

# Update all environments
environments=("production" "preview" "development")

for env in "${environments[@]}"; do
    echo ""
    echo -e "${GREEN}🎯 Force updating $env environment...${NC}"
    
    if [ ! -z "$VITE_SUPABASE_URL" ]; then
        force_update_env_var "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$env"
    fi
    
    if [ ! -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
        force_update_env_var "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_PUBLISHABLE_KEY" "$env"
    fi
    
    if [ ! -z "$VITE_SUPABASE_PROJECT_ID" ]; then
        force_update_env_var "VITE_SUPABASE_PROJECT_ID" "$VITE_SUPABASE_PROJECT_ID" "$env"
    fi
    
    if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        force_update_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "$env"
    fi
done

echo ""
echo -e "${GREEN}🚀 Force update completed!${NC}"
echo -e "${YELLOW}💡 Deploy to apply changes: vercel --prod${NC}"