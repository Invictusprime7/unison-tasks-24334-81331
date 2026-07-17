# Lovable API Key Setup Instructions

## How to Get Your Lovable API Key

Since you're working in a Lovable workspace, you can get your API key through the Lovable platform:

### Option 1: Through Lovable Dashboard
1. Go to your Lovable dashboard at [https://lovable.dev](https://lovable.dev)
2. Navigate to your project settings
3. Look for "API Keys" or "Developer Settings" section
4. Generate or copy your existing API key

### Option 2: Through Lovable CLI (if available)
```bash
# If you have Lovable CLI installed
lovable auth --show-key
```

### Option 3: Check Your Lovable Project Settings
1. In your current Lovable project
2. Look for project settings or environment variables
3. Check if there's an API key already configured

## Once You Have Your API Key

Run this command to add it to your environment:

```bash
# Replace YOUR_ACTUAL_KEY_HERE with your real Lovable API key
echo "LOVABLE_API_KEY=YOUR_ACTUAL_KEY_HERE" > .env.tmp
sed 's/LOVABLE_API_KEY=your_lovable_api_key_here/LOVABLE_API_KEY=YOUR_ACTUAL_KEY_HERE/' .env > .env.new
mv .env.new .env
rm .env.tmp
```

Or manually edit the `.env` file and replace:
```
LOVABLE_API_KEY=your_lovable_api_key_here
```

With:
```
LOVABLE_API_KEY=your_actual_lovable_api_key_here
```

## After Adding the Key

1. **Update Supabase secrets:**
```bash
supabase secrets set LOVABLE_API_KEY="your_actual_key_here"
```

2. **Update Vercel environment:**
```bash
./scripts/update-vercel-env.sh
```

3. **Restart your development server:**
```bash
npm run dev
```

## Verification

Test that your AI features are working by:
1. Going to the Creatives page
2. Trying the AI Code Assistant
3. Checking that AI page generation works

If you're still having issues, the API key might be:
- Incorrect format
- Expired
- Not activated for your account
- Missing required permissions