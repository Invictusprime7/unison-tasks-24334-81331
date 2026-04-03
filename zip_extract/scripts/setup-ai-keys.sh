#!/bin/bash

# AI API Keys Setup Script
# This script helps you configure OpenAI and Lovable API keys for AI features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 AI API Keys Setup${NC}"
echo -e "${BLUE}====================${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will help you configure API keys for AI features:${NC}"
echo -e "  • OpenAI API Key - Required for DALL-E image generation"
echo -e "  • Lovable API Key - Required for AI code generation"
echo ""

# Read current values from .env
CURRENT_OPENAI=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2 || echo "")
CURRENT_LOVABLE=$(grep "^LOVABLE_API_KEY=" .env | cut -d'=' -f2 || echo "")

# OpenAI API Key
echo -e "${BLUE}1. OpenAI API Key Setup${NC}"
if [ -n "$CURRENT_OPENAI" ] && [ "$CURRENT_OPENAI" != "your_openai_api_key_here" ]; then
    echo -e "${GREEN}✓ OpenAI API key is already configured${NC}"
    echo -e "${YELLOW}Current value: ${CURRENT_OPENAI:0:10}...${NC}"
    read -p "Do you want to update it? (y/N): " update_openai
    if [[ $update_openai =~ ^[Yy]$ ]]; then
        echo -e "Enter your new OpenAI API key (starts with sk-):"
        read -r -s NEW_OPENAI_KEY
    else
        NEW_OPENAI_KEY="$CURRENT_OPENAI"
    fi
else
    echo -e "${YELLOW}⚠️  OpenAI API key not configured${NC}"
    echo -e "Enter your OpenAI API key (starts with sk-, or press Enter to skip):"
    read -r -s NEW_OPENAI_KEY
fi

# Lovable API Key  
echo ""
echo -e "${BLUE}2. Lovable API Key Setup${NC}"
if [ -n "$CURRENT_LOVABLE" ] && [ "$CURRENT_LOVABLE" != "your_lovable_api_key_here" ]; then
    echo -e "${GREEN}✓ Lovable API key is already configured${NC}"
    echo -e "${YELLOW}Current value: ${CURRENT_LOVABLE:0:10}...${NC}"
    read -p "Do you want to update it? (y/N): " update_lovable
    if [[ $update_lovable =~ ^[Yy]$ ]]; then
        echo -e "Enter your new Lovable API key:"
        read -r -s NEW_LOVABLE_KEY
    else
        NEW_LOVABLE_KEY="$CURRENT_LOVABLE"
    fi
else
    echo -e "${YELLOW}⚠️  Lovable API key not configured${NC}"
    echo -e "Enter your Lovable API key (or press Enter to skip):"
    read -r -s NEW_LOVABLE_KEY
fi

# Update .env file
echo ""
echo -e "${YELLOW}Updating .env file...${NC}"

# Backup current .env
cp .env .env.backup
echo -e "${GREEN}✓ Backup created: .env.backup${NC}"

# Update OpenAI key
if [ -n "$NEW_OPENAI_KEY" ]; then
    if grep -q "^OPENAI_API_KEY=" .env; then
        sed -i "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$NEW_OPENAI_KEY/" .env
    else
        echo "OPENAI_API_KEY=$NEW_OPENAI_KEY" >> .env
    fi
    echo -e "${GREEN}✓ OpenAI API key updated${NC}"
else
    echo -e "${YELLOW}⚠️  OpenAI API key skipped${NC}"
fi

# Update Lovable key
if [ -n "$NEW_LOVABLE_KEY" ]; then
    if grep -q "^LOVABLE_API_KEY=" .env; then
        sed -i "s/^LOVABLE_API_KEY=.*/LOVABLE_API_KEY=$NEW_LOVABLE_KEY/" .env
    else
        echo "LOVABLE_API_KEY=$NEW_LOVABLE_KEY" >> .env
    fi
    echo -e "${GREEN}✓ Lovable API key updated${NC}"
else
    echo -e "${YELLOW}⚠️  Lovable API key skipped${NC}"
fi

# Supabase secrets setup
echo ""
echo -e "${BLUE}3. Supabase Secrets Setup${NC}"
read -p "Do you want to set up these secrets in your Supabase project? (y/N): " setup_secrets

if [[ $setup_secrets =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Setting up Supabase secrets...${NC}"
    
    if [ -n "$NEW_OPENAI_KEY" ]; then
        if supabase secrets set OPENAI_API_KEY="$NEW_OPENAI_KEY"; then
            echo -e "${GREEN}✓ OpenAI API key set in Supabase${NC}"
        else
            echo -e "${RED}❌ Failed to set OpenAI API key in Supabase${NC}"
        fi
    fi
    
    if [ -n "$NEW_LOVABLE_KEY" ]; then
        if supabase secrets set LOVABLE_API_KEY="$NEW_LOVABLE_KEY"; then
            echo -e "${GREEN}✓ Lovable API key set in Supabase${NC}"
        else
            echo -e "${RED}❌ Failed to set Lovable API key in Supabase${NC}"
        fi
    fi
fi

# Vercel environment setup
echo ""
echo -e "${BLUE}4. Vercel Environment Setup${NC}"
read -p "Do you want to update these keys in Vercel? (y/N): " setup_vercel

if [[ $setup_vercel =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Updating Vercel environment variables...${NC}"
    ./scripts/update-vercel-env.sh
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Your AI API keys are configured in .env"
echo -e "  2. Edge functions can now access these keys via Deno.env.get()"
echo -e "  3. Test your AI features in the application"
echo ""
echo -e "${YELLOW}Note: If you're using local Supabase, restart your local instance:${NC}"
echo -e "  supabase stop && supabase start"
echo ""
echo -e "${YELLOW}For production deployment, make sure to run:${NC}"
echo -e "  npm run build && vercel --prod"