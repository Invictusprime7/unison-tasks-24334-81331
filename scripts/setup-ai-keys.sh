#!/bin/bash

# AI API Keys Setup Script
# This script helps you configure direct provider keys for AI features

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
echo -e "  • Gemini API Key - Optional text generation fallback"
echo -e "  • Anthropic API Key - Optional text generation fallback"
echo ""

# Read current values from .env
CURRENT_OPENAI=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2 || echo "")
CURRENT_GEMINI=$(grep "^GEMINI_API_KEY=" .env | cut -d'=' -f2 || echo "")
CURRENT_ANTHROPIC=$(grep "^ANTHROPIC_API_KEY=" .env | cut -d'=' -f2 || echo "")

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

# Gemini API Key
echo ""
echo -e "${BLUE}2. Gemini API Key Setup${NC}"
if [ -n "$CURRENT_GEMINI" ] && [ "$CURRENT_GEMINI" != "your_gemini_api_key_here" ]; then
    echo -e "${GREEN}✓ Gemini API key is already configured${NC}"
    echo -e "${YELLOW}Current value: ${CURRENT_GEMINI:0:10}...${NC}"
    read -p "Do you want to update it? (y/N): " update_gemini
    if [[ $update_gemini =~ ^[Yy]$ ]]; then
        echo -e "Enter your new Gemini API key:"
        read -r -s NEW_GEMINI_KEY
    else
        NEW_GEMINI_KEY="$CURRENT_GEMINI"
    fi
else
    echo -e "${YELLOW}⚠️  Gemini API key not configured${NC}"
    echo -e "Enter your Gemini API key (or press Enter to skip):"
    read -r -s NEW_GEMINI_KEY
fi

# Anthropic API Key
echo ""
echo -e "${BLUE}3. Anthropic API Key Setup${NC}"
if [ -n "$CURRENT_ANTHROPIC" ] && [ "$CURRENT_ANTHROPIC" != "your_anthropic_api_key_here" ]; then
    echo -e "${GREEN}✓ Anthropic API key is already configured${NC}"
    echo -e "${YELLOW}Current value: ${CURRENT_ANTHROPIC:0:10}...${NC}"
    read -p "Do you want to update it? (y/N): " update_anthropic
    if [[ $update_anthropic =~ ^[Yy]$ ]]; then
        echo -e "Enter your new Anthropic API key:"
        read -r -s NEW_ANTHROPIC_KEY
    else
        NEW_ANTHROPIC_KEY="$CURRENT_ANTHROPIC"
    fi
else
    echo -e "${YELLOW}⚠️  Anthropic API key not configured${NC}"
    echo -e "Enter your Anthropic API key (or press Enter to skip):"
    read -r -s NEW_ANTHROPIC_KEY
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

# Update Gemini key
if [ -n "$NEW_GEMINI_KEY" ]; then
    if grep -q "^GEMINI_API_KEY=" .env; then
        sed -i "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$NEW_GEMINI_KEY/" .env
    else
        echo "GEMINI_API_KEY=$NEW_GEMINI_KEY" >> .env
    fi
    echo -e "${GREEN}✓ Gemini API key updated${NC}"
else
    echo -e "${YELLOW}⚠️  Gemini API key skipped${NC}"
fi

# Update Anthropic key
if [ -n "$NEW_ANTHROPIC_KEY" ]; then
    if grep -q "^ANTHROPIC_API_KEY=" .env; then
        sed -i "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$NEW_ANTHROPIC_KEY/" .env
    else
        echo "ANTHROPIC_API_KEY=$NEW_ANTHROPIC_KEY" >> .env
    fi
    echo -e "${GREEN}✓ Anthropic API key updated${NC}"
else
    echo -e "${YELLOW}⚠️  Anthropic API key skipped${NC}"
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
    
    if [ -n "$NEW_GEMINI_KEY" ]; then
        if supabase secrets set GEMINI_API_KEY="$NEW_GEMINI_KEY"; then
            echo -e "${GREEN}✓ Gemini API key set in Supabase${NC}"
        else
            echo -e "${RED}❌ Failed to set Gemini API key in Supabase${NC}"
        fi
    fi

    if [ -n "$NEW_ANTHROPIC_KEY" ]; then
        if supabase secrets set ANTHROPIC_API_KEY="$NEW_ANTHROPIC_KEY"; then
            echo -e "${GREEN}✓ Anthropic API key set in Supabase${NC}"
        else
            echo -e "${RED}❌ Failed to set Anthropic API key in Supabase${NC}"
        fi
    fi
fi

# Vercel environment setup
echo ""
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
echo -e "${YELLOW}For production, configure these keys as Supabase Edge Function secrets before deploying.${NC}"