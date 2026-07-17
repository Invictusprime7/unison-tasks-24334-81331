# OpenAI as Primary AI Service - Configuration Validation

## ✅ Setup Checklist

### 1. Supabase Secrets Configuration

Ensure both API keys are set in your Supabase project:

```bash
# Set OpenAI API key (PRIMARY)
supabase secrets set OPENAI_API_KEY="sk-proj-YOUR_ACTUAL_KEY_HERE"

# Set Lovable API key (FALLBACK)
supabase secrets set LOVABLE_API_KEY="your_lovable_key_here"
```

**Verification:**
```bash
# List all secrets
supabase secrets list

# Should show both:
# OPENAI_API_KEY ••••••
# LOVABLE_API_KEY ••••••
```

### 2. Environment Files

Update your `.env` file for local development:

```bash
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
LOVABLE_API_KEY=your_lovable_key_here
```

### 3. Vercel Deployment (if using Vercel)

```bash
# Update Vercel environment variables
./scripts/update-vercel-env.sh
```

Or manually:
```bash
vercel env add OPENAI_API_KEY
vercel env add LOVABLE_API_KEY
```

## 🧪 Testing the Configuration

### 1. Test System Launcher

```bash
npm run dev
# Navigate to onboarding
# Start creating a new site with System Launcher
# Check browser console for: [ai-code-assistant] logs
# Should see model used as "gpt-4o" or "gpt-4o-mini"
```

### 2. Test AI Code Assistant

```bash
# In web builder, try asking AI to make changes
# Check Supabase function logs:
supabase functions list
supabase functions get ai-code-assistant --logs

# Should see:
# [AI-Hybrid] Provider availability: { openaiDirect: true, lovableGateway: true/false, ... }
# [AI-Hybrid] Trying direct gpt-4o-mini via OPENAI_API_KEY ...
# [AI-Hybrid] Success with gpt-4o-mini via OPENAI_API_KEY
```

### 3. Check Provider Loop Logs

When running any AI feature, logs should show:

```
[AI-Hybrid] Provider availability {
  openaiDirect: true,
  lovableGateway: true|false,
  gatewayModels: [ 'google/gemini-3-flash-preview', ... ],
  openaiSecretSources: [ 'OPENAI_API_KEY' ]
}

[AI-Hybrid] Trying direct gpt-4o-mini via OPENAI_API_KEY (timeout: 25s)...
[AI-Hybrid] Success with gpt-4o-mini via OPENAI_API_KEY
```

## 🔄 Fallback Behavior

If OpenAI fails, the system should automatically fall back to Lovable Gateway:

```
[AI-Hybrid] gpt-4o-mini (OPENAI_API_KEY) error 401: Invalid API key
[AI-Hybrid] Trying Lovable AI Gateway model google/gemini-3-flash-preview
[AI-Hybrid] Success with google/gemini-3-flash-preview via LOVABLE_API_KEY
```

## 🚨 Troubleshooting

### Issue: "OPENAI_API_KEY not configured"

**Solution:**
```bash
# Verify the secret is set
supabase secrets list | grep OPENAI

# Re-set if missing
supabase secrets set OPENAI_API_KEY="sk-proj-YOUR_KEY"

# Restart edge functions
supabase functions deploy
```

### Issue: "All AI models failed"

**Check:**
1. OPENAI_API_KEY is valid and has credits
2. LOVABLE_API_KEY is valid (if using as fallback)
3. API keys are properly set as Supabase secrets
4. No network/firewall issues blocking api.openai.com

### Issue: Still using Gemini models (not OpenAI)

**Verify in browser console:**
```javascript
// Check Network tab in DevTools
// Look for POST to: api.openai.com/v1/chat/completions
// Should NOT see: ai.gateway.lovable.dev
```

**If still using Lovable gateway:**
1. Clear Supabase secrets and re-deploy
2. Check orchestrator logs: `[orchestrator] Prompt complexity:`
3. Verify aiProviderLoop reads OPENAI_API_KEY: `[readOpenAISecrets]`

## 📊 Configuration Summary

| Component | Primary | Fallback | Function |
|-----------|---------|----------|----------|
| Direct API | OpenAI | - | Phase 1 (main route) |
| Gateway API | - | Lovable (Gemini) | Phase 2 (if Phase 1 fails) |
| **Models (Primary)** | gpt-4o, gpt-4o-mini | - | Best quality/speed |
| **Models (Fallback)** | - | google/gemini-3-flash-preview | Backup option |
| **API Timeout** | 25-45s per model | 30-45s per model | Respects task type |

## 🎯 Framework Compatibility

All framework types work best with OpenAI's GPT-4o models:

- ✅ **Booking Systems** - OpenAI models understand complex business logic
- ✅ **SaaS Platforms** - Great for technical requirements
- ✅ **Agencies** - Excellent for flexible design patterns
- ✅ **Portfolios** - Strong at creative descriptions and styling
- ✅ **E-Commerce** - Reliable for product/payment integration

## 📝 Notes

- **No changes needed** to existing code — just ensure secrets are set
- **Automatic fallback** — if OpenAI unavailable, Lovable gateway will be used
- **Framework compatibility** — OpenAI models work with all business system types
- **Best practices** — Keep both API keys configured for resilience
