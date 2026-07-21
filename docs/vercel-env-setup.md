# Vercel Environment Variables Configuration
# Copy these to your Vercel project settings under Environment Variables

# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI services
# Configure provider credentials such as OPENAI_API_KEY as Supabase Edge
# Function secrets. Do not add provider keys to Vercel or VITE_ variables.

# Production Configuration
VERCEL_ENV=production
NODE_ENV=production
VITE_AI_ENABLED=true

# Build Configuration
ENABLE_EXPERIMENTAL_COREPACK=1

# Security Headers
VITE_APP_DOMAIN=your-app-domain.vercel.app
VITE_SUPABASE_AUTH_DOMAIN=your-project.supabase.co

# Performance Monitoring
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true

# Feature Flags
VITE_ENABLE_DESIGN_STUDIO=true
VITE_ENABLE_CANVAS_STUDIO=true
VITE_ENABLE_AI_TEMPLATES=true
VITE_ENABLE_COLLABORATION=true

# Deployment Settings
VITE_BUILD_TIME=${VERCEL_GIT_COMMIT_SHA}
VITE_DEPLOYMENT_URL=${VERCEL_URL}