#!/bin/bash

# Supabase setup script for self-hosted backend

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up Supabase for local/self-hosted backend...${NC}\n"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Installing Supabase CLI...${NC}"
    npm install -g supabase
fi

echo -e "${GREEN}✓ Supabase CLI installed${NC}"

# Login to Supabase
echo -e "\n${YELLOW}Logging into Supabase...${NC}"
supabase login

# Link to project (or create new)
echo -e "\n${YELLOW}Enter your Supabase project ID (or press Enter to create new):${NC}"
read -r PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Creating new Supabase project...${NC}"
    supabase projects create my-project
else
    echo -e "${YELLOW}Linking to project: $PROJECT_ID${NC}"
    supabase link --project-ref "$PROJECT_ID"
fi

# Apply database migrations
echo -e "\n${YELLOW}Applying database migrations...${NC}"
if [ -d "supabase/migrations" ]; then
    supabase db push
    echo -e "${GREEN}✓ Migrations applied${NC}"
else
    echo -e "${YELLOW}⚠️  No migrations found${NC}"
fi

# Deploy Edge Functions
echo -e "\n${YELLOW}Deploying Edge Functions...${NC}"
if [ -d "supabase/functions" ]; then
    for dir in supabase/functions/*/; do
        func_name=$(basename "$dir")
        echo -e "  Deploying: $func_name"
        supabase functions deploy "$func_name"
    done
    echo -e "${GREEN}✓ Edge Functions deployed${NC}"
else
    echo -e "${YELLOW}⚠️  No Edge Functions found${NC}"
fi

# Set secrets
echo -e "\n${YELLOW}Setting up secrets...${NC}"
echo -e "Enter OPENAI_API_KEY (or press Enter to skip):"
read -r -s OPENAI_KEY

echo -e "Enter GEMINI_API_KEY (or press Enter to skip):"
read -r -s GEMINI_KEY

echo -e "Enter ANTHROPIC_API_KEY (or press Enter to skip):"
read -r -s ANTHROPIC_KEY

if [ -n "$OPENAI_KEY" ]; then
    supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
    echo -e "${GREEN}✓ OpenAI API key configured${NC}"
fi

if [ -n "$GEMINI_KEY" ]; then
    supabase secrets set GEMINI_API_KEY="$GEMINI_KEY"
    echo -e "${GREEN}✓ Gemini API key configured${NC}"
fi

if [ -n "$ANTHROPIC_KEY" ]; then
    supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
    echo -e "${GREEN}✓ Anthropic API key configured${NC}"
fi

if [ -n "$OPENAI_KEY" ] || [ -n "$GEMINI_KEY" ] || [ -n "$ANTHROPIC_KEY" ]; then
    echo -e "${GREEN}✓ Secrets configured${NC}"
else
    echo -e "${YELLOW}⚠️  No secrets configured - AI features will be limited${NC}"
fi

# Get project URL and keys
echo -e "\n${YELLOW}Fetching project credentials...${NC}"
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

# Update .env file
echo -e "\n${YELLOW}Updating .env file...${NC}"
cat > .env << EOF
# Supabase Configuration (Self-hosted)
VITE_SUPABASE_URL=$PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=$PROJECT_ID
EOF

echo -e "${GREEN}✓ .env file updated${NC}"

echo -e "\n${GREEN}✅ Supabase setup complete!${NC}"
echo -e "\n${YELLOW}Project URL:${NC} $PROJECT_URL"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run: ${GREEN}npm run dev${NC} to start development server"
echo -e "  2. Visit Supabase dashboard: ${GREEN}https://supabase.com/dashboard/project/$PROJECT_ID${NC}\n"
