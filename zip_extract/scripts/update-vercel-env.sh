#!/bin/bash

# Update Vercel Environment Variables
# This script updates all environment variables for the Vercel project

set -e

echo "🔧 Updating Vercel Environment Variables..."

# Read environment variables from .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

echo "📋 Environment variables loaded from .env"

# Function to add or update environment variable
update_env_var() {
    local var_name=$1
    local var_value=$2
    local environment=$3
    
    echo "Setting $var_name for $environment environment..."
    
    # Try to add the variable, if it exists, remove and add again
    if vercel env add "$var_name" "$environment" <<< "$var_value" 2>/dev/null; then
        echo "✅ Added $var_name to $environment"
    else
        echo "🔄 $var_name already exists, updating..."
        # Remove existing variable first
        echo "y" | vercel env rm "$var_name" "$environment" > /dev/null 2>&1 || true
        # Add the new value
        if vercel env add "$var_name" "$environment" <<< "$var_value"; then
            echo "✅ Updated $var_name in $environment"
        else
            echo "❌ Failed to update $var_name in $environment"
        fi
    fi
}

# Update Supabase variables for all environments
environments=("production" "preview" "development")

for env in "${environments[@]}"; do
    echo ""
    echo "🎯 Updating $env environment..."
    
    # Core Supabase variables
    if [ ! -z "$VITE_SUPABASE_URL" ]; then
        update_env_var "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$env"
    fi
    
    if [ ! -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
        update_env_var "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_PUBLISHABLE_KEY" "$env"
    fi
    
    if [ ! -z "$VITE_SUPABASE_PROJECT_ID" ]; then
        update_env_var "VITE_SUPABASE_PROJECT_ID" "$VITE_SUPABASE_PROJECT_ID" "$env"
    fi
    
    if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        update_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "$env"
    fi
    
    # AI Service API Keys
    if [ ! -z "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "your_openai_api_key_here" ]; then
        update_env_var "OPENAI_API_KEY" "$OPENAI_API_KEY" "$env"
    fi
    
    if [ ! -z "$LOVABLE_API_KEY" ] && [ "$LOVABLE_API_KEY" != "your_lovable_api_key_here" ]; then
        update_env_var "LOVABLE_API_KEY" "$LOVABLE_API_KEY" "$env"
    fi
    
    # Additional application variables for all environments
    if [ ! -z "$NODE_ENV" ]; then
        update_env_var "NODE_ENV" "$NODE_ENV" "$env"
    fi
    
    if [ ! -z "$VITE_AI_ENABLED" ]; then
        update_env_var "VITE_AI_ENABLED" "$VITE_AI_ENABLED" "$env"
    fi
    
    if [ ! -z "$VITE_ENABLE_ANALYTICS" ]; then
        update_env_var "VITE_ENABLE_ANALYTICS" "$VITE_ENABLE_ANALYTICS" "$env"
    fi
    
    if [ ! -z "$VITE_ENABLE_ERROR_REPORTING" ]; then
        update_env_var "VITE_ENABLE_ERROR_REPORTING" "$VITE_ENABLE_ERROR_REPORTING" "$env"
    fi
done

echo ""
echo "🚀 Environment variables updated successfully!"
echo "💡 Trigger a new deployment for changes to take effect:"
echo "   vercel --prod"