# AI Features Setup Guide

Your application has comprehensive AI capabilities that require API keys to function properly. This guide will help you get everything working.

## 🔧 Quick Setup

Run the automated setup script:

```bash
./scripts/setup-ai-keys.sh
```

This script will:
- Guide you through entering your API keys
- Update your `.env` file
- Configure Supabase secrets (if using Supabase locally)
- Update Vercel environment variables (optional)

## 🔑 Required API Keys

### 1. OpenAI API Key
- **Required for**: DALL-E image generation
- **Get it from**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Format**: Starts with `sk-`
- **Usage**: Image generation via the `generate-image` edge function

### 2. Lovable API Key  
- **Required for**: AI code generation, page generation, copy rewriting
- **Get it from**: Your Lovable workspace
- **Usage**: Most AI features via multiple edge functions

## 🚀 AI Features Available

Once configured, your app will have:

### Image Generation
- **Component**: `AIImageGeneratorDialog`
- **Service**: `generateAIImage()` in `openaiService.ts`
- **Edge Function**: `generate-image`
- **Uses**: OpenAI DALL-E 3

### Code Assistant
- **Component**: `AICodeAssistant`
- **Service**: `generateAICode()` in `openaiService.ts`
- **Edge Function**: `ai-code-assistant`
- **Uses**: Lovable AI Gateway

### Copy Rewriting
- **Service**: `rewriteCopy()` in `openaiService.ts`
- **Edge Function**: `copy-rewrite`
- **Uses**: Lovable AI Gateway

### Page Generation
- **Service**: `generatePage()` in `openaiService.ts`
- **Edge Function**: `generate-page`
- **Uses**: Lovable AI Gateway

### Template Generation
- **Edge Functions**: `generate-template`, `generate-ai-template`
- **Uses**: Lovable AI Gateway

### Design Assistant
- **Edge Function**: `ai-design-assistant`
- **Uses**: Lovable AI Gateway

### Web Builder AI
- **Edge Function**: `web-builder-ai`
- **Uses**: Lovable AI Gateway

## 📁 Environment Files

### Local Development (`.env`)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_SUPABASE_PROJECT_ID=your_project_id
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Service API Keys
OPENAI_API_KEY=sk-your_openai_key_here
LOVABLE_API_KEY=your_lovable_key_here
```

### Supabase Secrets (Edge Functions)
```bash
# Set these in your Supabase project
supabase secrets set OPENAI_API_KEY="sk-your_key_here"
supabase secrets set LOVABLE_API_KEY="your_lovable_key_here"
```

### Vercel Environment Variables
```bash
# These are automatically set by the update script
OPENAI_API_KEY=sk-your_key_here
LOVABLE_API_KEY=your_lovable_key_here
# ... plus all Supabase variables
```

## 🛠️ Manual Setup

If you prefer to set things up manually:

### 1. Update `.env` File
```bash
echo "OPENAI_API_KEY=sk-your_key_here" >> .env
echo "LOVABLE_API_KEY=your_lovable_key_here" >> .env
```

### 2. Configure Supabase Secrets
```bash
supabase secrets set OPENAI_API_KEY="sk-your_key_here"
supabase secrets set LOVABLE_API_KEY="your_lovable_key_here"
```

### 3. Update Vercel (if deployed)
```bash
./scripts/update-vercel-env.sh
```

## 🔍 Testing AI Features

### Check Service Status
```typescript
import { getAIServiceStatus } from '@/services/openaiService';

const status = await getAIServiceStatus();
console.log(status.message);
```

### Test Image Generation
```typescript
import { generateAIImage } from '@/services/openaiService';

const result = await generateAIImage({
  prompt: "A beautiful sunset over mountains",
  style: "digital-art"
});
```

### Test Code Generation
```typescript
import { generateAICode } from '@/services/openaiService';

const result = await generateAICode({
  messages: [
    { role: 'user', content: 'Create a React button component' }
  ],
  mode: 'component'
});
```

## 🐛 Troubleshooting

### "AI features unavailable in local development"
- Set up your API keys in `.env` file
- Configure Supabase secrets with `supabase secrets set`
- Restart your local Supabase instance: `supabase stop && supabase start`

### "Failed to send request to Edge Function"
- Ensure edge functions are deployed: `supabase functions deploy`
- Check that secrets are set in Supabase project
- Verify API keys are valid and have sufficient credits

### Rate Limits or Credit Issues
- **OpenAI**: Check your OpenAI account billing and usage limits
- **Lovable**: Check your Lovable workspace credits

## 📚 Development Notes

- Edge functions handle API key validation and availability checks
- Client-side services in `openaiService.ts` provide typed interfaces
- All AI calls go through Supabase Edge Functions for security
- Error handling includes rate limiting and credit management
- Local development supports the same features as production

## 🎯 Next Steps

1. Run `./scripts/setup-ai-keys.sh` to get started
2. Test AI features in your application
3. Deploy to production with `vercel --prod`
4. Monitor API usage and costs in your provider dashboards

Your AI features should now be fully functional! 🎉