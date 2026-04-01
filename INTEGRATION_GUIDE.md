# Architectural Consolidation — Integration Checklist

**Phase 1 & 2 Complete** ✅  
**Date:** March 31, 2026  

## What's Ready Now

Three new infrastructure pieces are live:

### 1. LaunchState Type System
- Located: `src/types/launchState.ts`
- Captures: business context, blueprint, VFS files, intents, aesthetic, metadata
- Helper: `createLaunchState()` factory function

### 2. LaunchContext React Provider
- Located: `src/contexts/LaunchContext.tsx`
- Exports: `useLaunch()` hook for optional launch access
- Exports: `useLaunchRequired()` hook for mandatory access
- Features: setLaunch, updateLaunch, clearLaunch, isFreshLaunch

### 3. Launch-to-Sandpack Converter
- Located: `src/utils/launchToSandpack.ts`
- Function: `launchStateToSandpackFiles(launchState, vfsFiles)`
- Does: Injects semantic theme CSS, intent metadata, creates Sandpack-ready structure
- Debug: `debugLaunchToSandpack()` for logging

## Integration Steps (Do These)

### Step 1: Wrap App Root with LaunchProvider

Find: Root layout file (likely [App.tsx](src/App.tsx) or index entry)

```typescript
import { LaunchProvider } from '@/contexts/LaunchContext';
import { VFSProvider } from '@/contexts/VFSContext';

export function App() {
  return (
    <LaunchProvider>
      <VFSProvider>
        {/* your routes here */}
      </VFSProvider>
    </LaunchProvider>
  );
}
```

**Why:** Makes `useLaunch()` available throughout the app.

### Step 2: Test Fresh Launch Flow

1. Open SystemLauncher wizard
2. Generate a site
3. Observe navigation to WebBuilder with `launchState` in nav.state
4. Check browser console: Should see launch metadata logged
5. VFSPreview should render with theme CSS applied

### Step 3: Test Editing Flow

1. In WebBuilder, edit `/src/App.tsx` code
2. VFSPreview should still render (fallback path)
3. No launch context needed

### Step 4: Test AI Regeneration

1. In WebBuilder, trigger AI regeneration (if available)
2. New code returns from AI
3. Call `updateLaunch({ vfsFiles: newCode })`
4. VFSPreview should update immediately

---

## Files to Review

**Read to Understand:**
1. [ARCHITECTURAL_CONSOLIDATION.md](ARCHITECTURAL_CONSOLIDATION.md) — Full technical writeup
2. [src/types/launchState.ts](src/types/launchState.ts) — Type definitions
3. [src/contexts/LaunchContext.tsx](src/contexts/LaunchContext.tsx) — Provider implementation
4. [src/utils/launchToSandpack.ts](src/utils/launchToSandpack.ts) — Sandpack converter

**Review Changes:**
1. [src/components/onboarding/SystemLauncher.tsx](src/components/onboarding/SystemLauncher.tsx#L619-L650) — LaunchState wrapping
2. [src/components/VFSPreview.tsx](src/components/VFSPreview.tsx#L35-40) — Context-aware preview

---

## What's Next (Optional Enhancements)

### After Phase 1 & 2, You Can Now:

**A. Add launch awareness to other components**
```typescript
import { useLaunch } from '@/contexts/LaunchContext';

export function MyComponent() {
  const { launch } = useLaunch();
  if (launch?.systemType === 'booking') {
    // Show booking-specific UI
  }
}
```

**B. Track launch lifecycle**
```typescript
const { isFreshLaunch, clearLaunch } = useLaunch();

// When user navigates away from builder
useEffect(() => {
  return () => clearLaunch();
}, [clearLaunch]);
```

**C. Enhance AI panels with launch context**
```typescript
const { launch, updateLaunch } = useLaunch();

// Pass current launch metadata to AI for better context
const aiResponse = await generateWithContext({
  businessName: launch?.businessName,
  systemType: launch?.systemType,
  currentCode: launch?.vfsFiles['/src/App.tsx'],
});

// Update launch with new code
updateLaunch({ vfsFiles: aiResponse.files });
```

---

## Troubleshooting

**Q: LaunchContext not found**  
A: Ensure `LaunchProvider` wraps your routes, and import path is correct.

**Q: LaunchState is null in VFSPreview**  
A: Normal when user navigates to WebBuilder without fresh launch. Check `launch?.isFreshLaunch`.

**Q: Sandpack not loading theme CSS**  
A: Verify `launchStateToSandpackFiles()` is being called (add console.log in VFSPreview memo).

**Q: Build failing with LaunchState imports**  
A: Check TypeScript syntax in `launchState.ts` — ensure all type exports match imports.

---

## Performance Notes

- LaunchContext is lightweight (string + object)
- useLaunch() hook has zero-cost if app never launches
- launchStateToSandpackFiles() runs once per VFS update
- No runtime overhead for non-launch scenarios

---

## Status

✅ Phase 1 & 2 complete  
✅ Build succeeds  
✅ Types verified  
✅ Documentation complete  
🚀 Ready for Phase 3 (Fabric isolation)

Next work:
- Phase 3: Extract CanvasEditor to isolate Fabric
- Phase 4: Split WebBuilder into focused components

Contact: Copilot (code@unison-tasks)
