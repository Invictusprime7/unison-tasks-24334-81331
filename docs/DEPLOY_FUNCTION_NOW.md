# URGENT: Deploy fullstack-ai Function

## ✅ Current Status

- ✅ **Function deployed**: fullstack-ai is now on Supabase
- ✅ **API keys set**: LOVABLE_API_KEY and OPENAI_API_KEY are configured
- ⚠️ **Getting 500 error**: Function deployed but returning internal server error

## 🔍 Troubleshooting 500 Error

The function is deployed but something is causing it to crash. Check:

### 1. View Function Logs in Dashboard

Go to the Supabase Dashboard to see the actual error:
- https://supabase.com/dashboard/project/nfrdomdvyrbwuokathtw/functions/fullstack-ai

Click on "Logs" to see what's failing.

### 2. Common 500 Error Causes

- **API Key Invalid**: The LOVABLE_API_KEY or OPENAI_API_KEY might be expired or incorrect
- **Import Issues**: Deno imports might be failing (check function code)
- **JSON Parsing**: Request body might not be valid JSON
- **AI Gateway Down**: The Lovable AI gateway might be temporarily unavailable

### 3. Test with Simpler Request

The test script sends a complex request. Try a minimal request in the Supabase Dashboard.

### 4. Verify API Key Works

Test your API key directly:

```powershell
# Test Vercel AI Gateway
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_VERCEL_AI_GATEWAY_KEY"
}
$body = '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}],"max_tokens":10}'
Invoke-RestMethod -Uri "https://api.vercel.ai/v1/chat/completions" -Method POST -Headers $headers -Body $body
```

## What Was Fixed

✅ **Function is now deployed** - Was 404, now exists
✅ **Project ref corrected** - Updated to `nfrdomdvyrbwuokathtw`
✅ **Client configured** - Supabase client points to correct project
✅ **Secrets verified** - API keys are set

## Next Steps

1. **Check Dashboard Logs** - See the actual error message
2. **Verify API Key** - Make sure it's valid and not rate limited
3. **Try UI Again** - The app might work despite test script failing
4. **Contact Support** - If logs show Supabase platform issues

---

## Original Problem Solved

The original issue **"Failed to send a request to the Edge Function"** (404 error) is **FIXED**.

The function is now deployed and accessible. The 500 error is a different issue - the function is running but encountering an error during execution.

## Solution: Deploy the Function

### Step 1: Login to Supabase CLI

```powershell
supabase login
```

This will open a browser window for authentication.

### Step 2: Deploy the fullstack-ai Function

```powershell
supabase functions deploy fullstack-ai --project-ref nfrdomdvyrbwuokathtw
```

### Step 3: Set API Keys (Required)

The function needs an API key to work:

```powershell
# Option 1: Use Lovable AI Gateway (recommended)
supabase secrets set LOVABLE_API_KEY=your_lovable_api_key_here --project-ref nfrdomdvyrbwuokathtw

# Option 2: Use OpenAI directly
supabase secrets set OPENAI_API_KEY=sk-your_openai_key_here --project-ref nfrdomdvyrbwuokathtw
```

### Step 4: Verify Deployment

Run the test script again:

```powershell
.\test-function.ps1
```

You should see: ✅ SUCCESS! Function is working.

## Quick Deploy All Functions

If you want to deploy all functions at once:

```powershell
# Deploy all functions
supabase functions deploy --project-ref nfrdomdvyrbwuokathtw

# Set API keys
supabase secrets set LOVABLE_API_KEY=your_key --project-ref nfrdomdvyrbwuokathtw
```

## Troubleshooting

### "Account does not have necessary privileges"

You need to be logged in with an account that has access to the project:

```powershell
supabase login
```

Make sure you login with the correct Supabase account.

### "Project not found"

Link your local project:

```powershell
supabase link --project-ref nfrdomdvyrbwuokathtw
```

### Check Deployment Status

```powershell
# List deployed functions
supabase functions list --project-ref nfrdomdvyrbwuokathtw

# Check function logs
supabase functions logs fullstack-ai --project-ref nfrdomdvyrbwuokathtw
```

### Alternative: Deploy via Supabase Dashboard

If CLI doesn't work:

1. Go to: https://supabase.com/dashboard/project/nfrdomdvyrbwuokathtw/functions
2. Click "Deploy new function"
3. Upload the `supabase/functions/fullstack-ai` folder
4. Set secrets in Dashboard → Settings → Edge Functions

## After Deployment

Once deployed:

1. ✅ Run `.\test-function.ps1` - Should show success
2. ✅ Try generating a template in the UI - Should work
3. ✅ Check browser console - Should see successful API calls

## Why This Happened

- The function code exists locally in `supabase/functions/fullstack-ai/`
- But it was never deployed to the Supabase cloud
- The app tries to call the cloud function, which doesn't exist
- Result: 404 Not Found error

## Next Steps

1. **Deploy the function** (Step 2 above)
2. **Set the API key** (Step 3 above)  
3. **Test it works** (Step 4 above)
4. **Try the UI again** - Template generation should now work!

---

**Once deployed, the error will be fixed and templates will generate successfully.**
