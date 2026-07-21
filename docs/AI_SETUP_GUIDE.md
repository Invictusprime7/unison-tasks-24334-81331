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

### 2. Gemini text generation
- **Used for**: Builder and Wizard text/code generation through Supabase Edge Functions
- **Runtime**: A configurable weighted distribution with OpenAI, with automatic fallback
- **Secret**: `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) on Supabase only

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
- **Uses**: Direct Gemini/OpenAI runtime with configurable traffic distribution

### Copy Rewriting
- **Service**: `rewriteCopy()` in `openaiService.ts`
- **Edge Function**: `copy-rewrite`
- **Uses**: Direct OpenAI API

### Page Generation
- **Service**: `generatePage()` in `openaiService.ts`
- **Edge Function**: `generate-page`
- **Uses**: Direct OpenAI API

### Template Generation
- **Edge Functions**: `generate-template`, `generate-ai-template`
- **Uses**: Direct OpenAI API

### Design Assistant
- **Edge Function**: `ai-design-assistant`
- **Uses**: Direct OpenAI API

### Web Builder AI
- **Edge Function**: `web-builder-ai`
- **Uses**: Direct OpenAI API

## 📁 Environment Files

### Local Development (`.env`)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_SUPABASE_PROJECT_ID=your_project_id
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI provider keys belong in Supabase Edge Function secrets, never VITE_ variables.
```

### Supabase Secrets (Edge Functions)
```bash
# Set these in your Supabase project. Provider keys are server-only.
supabase secrets set GEMINI_API_KEY="your_gemini_key" OPENAI_API_KEY="sk-your_key_here" AI_PROVIDER_DISTRIBUTION="gemini=50,openai=50"
```

### Vercel Environment Variables
```bash
# Configure only frontend-safe VITE_SUPABASE_* values in Vercel.
# Keep provider keys in Supabase Edge Function secrets.
```

## 🛠️ Manual Setup

If you prefer to set things up manually:

### 1. Configure Supabase Secrets and deploy the provider runtime
```bash
supabase secrets set GEMINI_API_KEY="your_gemini_key" OPENAI_API_KEY="sk-your_key_here" AI_PROVIDER_DISTRIBUTION="gemini=50,openai=50"
supabase functions deploy ai-code-assistant --no-verify-jwt
```

### 2. Update Vercel (if deployed)
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
- Configure provider keys as Supabase Edge Function secrets
- Configure Supabase secrets with `supabase secrets set`
- Restart your local Supabase instance: `supabase stop && supabase start`

### "Failed to send request to Edge Function"
- Ensure edge functions are deployed: `supabase functions deploy`
- Check that secrets are set in Supabase project
- Verify API keys are valid and have sufficient credits

### Rate Limits or Credit Issues
- **OpenAI**: Check your OpenAI account billing and usage limits
- **Direct providers**: Check the provider dashboard for usage limits and billing

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