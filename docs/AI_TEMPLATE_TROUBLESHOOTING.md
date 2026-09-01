# AI Web Builder Template Rendering - Troubleshooting Guide

## Overview
This document outlines the complete AI template generation and rendering pipeline for the Lovable AI Web Builder.

## Architecture Flow

```
User Prompt → AI Assistant Panel → useWebBuilderAI Hook → Edge Function → Lovable AI Gateway
                                          ↓
                                  AIGeneratedTemplate
                                          ↓
                    WebBuilder.onTemplateGenerated Callback
                                          ↓
                      useTemplateState.updateTemplate()
                                    ↙         ↘
                    TemplateRenderer        TemplateToHTMLExporter
                    (Fabric Canvas)         (HTML Preview)
                         ↓                        ↓
                   Canvas Display            SecureIframe Preview
```

## Key Components

### 1. **AIAssistantPanel** (`src/components/creatives/web-builder/AIAssistantPanel.tsx`)
- Detects if user wants a full template vs individual elements
- Keywords: "template", "page", "website", "landing page", "full design"
- Calls `generateTemplate()` for full templates
- Calls `generateDesign()` for quick elements

### 2. **useWebBuilderAI Hook** (`src/hooks/useWebBuilderAI.ts`)
- `generateTemplate()`: Invokes `generate-ai-template` edge function
- Returns `AITemplateResponse` with template structure
- Validates response and calls `onTemplateGenerated` callback
- **Enhanced with comprehensive logging**

### 3. **Edge Function** (`supabase/functions/generate-ai-template/index.ts`)
- Calls Lovable AI Gateway (Google Gemini 2.5 Flash)
- Uses detailed system prompt with exact schema
- Validates AI response structure
- Returns complete `AIGeneratedTemplate` object
- **Enhanced with validation and error messages**

### 4. **useTemplateState Hook** (`src/hooks/useTemplateState.ts`)
- Single source of truth for template state
- Validates template structure before rendering
- Preloads fonts and images
- Renders to BOTH Fabric canvas AND HTML
- **Enhanced with detailed logging and validation**

### 5. **WebBuilder** (`src/components/creatives/WebBuilder.tsx`)
- Initializes Fabric canvas
- Provides `onTemplateGenerated` callback
- Shows preview dialog after successful render
- **Enhanced with error handling**

## Best Practices for Users

### ✅ DO:
1. **Wait for canvas initialization** - The canvas needs a moment to initialize
2. **Use descriptive prompts** - "Create a landing page for a SaaS product"
3. **Check console logs** - All steps are logged with emoji markers (✅ ❌)
4. **Try quick actions first** - Use the quick prompt buttons
5. **Be specific** - "Create a hero section with blue theme" works better than "make it nice"

### ❌ DON'T:
1. **Don't spam requests** - Wait for previous render to complete
2. **Don't close panels prematurely** - Let the render finish
3. **Don't navigate away** - Stay on page during generation
4. **Don't use vague prompts** - "make something" won't work well

## Template Structure Requirements

Every AI-generated template MUST have:

```typescript
{
  id: string,
  name: string,
  description: string,
  industry: string,
  brandKit: {
    primaryColor: string,
    secondaryColor: string,
    accentColor: string,
    fonts: { heading, body, accent }
  },
  sections: [
    {
      id: string,
      name: string,
      type: "hero" | "content" | "gallery" | "cta" | "footer" | "custom",
      constraints: { width, height, padding, gap, flexDirection, alignItems, justifyContent },
      components: [
        {
          id: string,
          type: "text" | "image" | "shape" | "button" | "container",
          constraints: { width, height },
          dataBinding: { field, type, defaultValue },
          style: { backgroundColor, borderRadius, opacity },
          fabricProps: { fontSize, fontFamily, fill, fontWeight }
        }
      ]
    }
  ],
  variants: [
    { id, name, size: { width, height }, format: "web" }
  ],
  data: { [key: string]: any }
}
```

## Debugging Guide

### Check Console Logs:
1. **[useWebBuilderAI]** - AI hook operations
2. **[TemplateState]** - Template state management
3. **[TemplateRenderer]** - Canvas rendering
4. **[WebBuilder]** - Component integration

### Common Issues:

#### Issue: "Canvas not ready"
**Solution**: Wait 1-2 seconds after page load before generating templates

#### Issue: Template not appearing
**Check**:
- Console for validation errors
- Template structure has sections array
- Template structure has variants array
- Fabric canvas is initialized (check WebBuilder logs)

#### Issue: Partial render
**Check**:
- Asset preloading completed
- No network errors for fonts/images
- Component types are valid

#### Issue: HTML preview not showing
**Check**:
- Template rendered to canvas successfully first
- HTML sanitization passed
- SecureIframe component logs

## Monitoring Template Generation

### Success Indicators:
```
[useWebBuilderAI] Generating template with prompt: ...
[useWebBuilderAI] Received data: ...
[useWebBuilderAI] Valid template created: ...
[useWebBuilderAI] Calling onTemplateGenerated callback
[WebBuilder] Template received from AI: ...
[TemplateState] updateTemplate called with: ...
[TemplateState] Assets preloaded, starting canvas render
[TemplateState] ✅ Template rendered to Fabric Canvas
[TemplateState] ✅ HTML/CSS exported and sanitized
[WebBuilder] ✅ Template successfully rendered
Toast: "✨ AI template rendered successfully!"
```

### Error Indicators:
```
[TemplateState] ❌ Error rendering template: ...
[WebBuilder] ❌ Failed to render template: ...
Toast: Error message
```

## Performance Tips

1. **Asset Preloading**: Templates with images take longer - this is normal
2. **Complex Templates**: More sections = longer render time
3. **Font Loading**: First render may be slower due to font loading
4. **Canvas Size**: Larger canvases (more sections) render slower

## Future Enhancements

Potential improvements:
- [ ] Template caching to avoid re-rendering
- [ ] Progressive rendering (sections appear one by one)
- [ ] Template preview thumbnails
- [ ] Template library with saved templates
- [ ] Real-time collaboration on templates
- [ ] A/B testing for template variants
