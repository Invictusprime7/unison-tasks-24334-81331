#!/bin/bash

# Deployment script for multiple platforms
# Usage: ./scripts/deploy.sh [platform]
# Platforms: vercel, netlify, docker, manual

set -e

PLATFORM=${1:-manual}
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying to ${PLATFORM}...${NC}\n"

# Build the project
build_project() {
    echo -e "${YELLOW}📦 Building project...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}\n"
}

# Deploy to Vercel
deploy_vercel() {
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
        npm install -g vercel
    fi
    
    echo -e "${YELLOW}Deploying to Vercel...${NC}"
    vercel --prod
}

# Deploy to Netlify
deploy_netlify() {
    if ! command -v netlify &> /dev/null; then
        echo -e "${RED}❌ Netlify CLI not found. Installing...${NC}"
        npm install -g netlify-cli
    fi
    
    build_project
    echo -e "${YELLOW}Deploying to Netlify...${NC}"
    netlify deploy --prod --dir=dist
}

# Deploy with Docker
deploy_docker() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker build -t my-app:latest --target production .
    
    echo -e "${YELLOW}Starting container...${NC}"
    docker-compose up -d
    
    echo -e "${GREEN}✓ Docker deployment complete${NC}"
    echo -e "Access your app at: ${GREEN}http://localhost${NC}"
}

# Manual deployment (just build)
deploy_manual() {
    build_project
    echo -e "${GREEN}✓ Build files are in the 'dist' directory${NC}"
    echo -e "${YELLOW}Upload these files to your hosting provider${NC}"
}

case $PLATFORM in
    vercel)
        deploy_vercel
        ;;
    netlify)
        deploy_netlify
        ;;
    docker)
        deploy_docker
        ;;
    manual)
        deploy_manual
        ;;
    *)
        echo -e "${RED}Unknown platform: $PLATFORM${NC}"
        echo -e "Usage: ./scripts/deploy.sh [vercel|netlify|docker|manual]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ Deployment complete!${NC}\n"
