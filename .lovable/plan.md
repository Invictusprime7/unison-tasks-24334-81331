## Objective

Remove the runtime "auto-page generation when a button is clicked" feature in the Web Builder. When a user clicks a redirect-style button in the preview that targets a page not present in the VFS, the system must **not** call the AI to generate that page anymore. Instead, it should rely on the deterministic canonical router + existing scaffolded placeholders.

No changes to System Launcher, Creator Playground, or any other surface.

---

## Changes

### 1. `src/components/creatives/WebBuilder.tsx`

- Delete the `triggerPageGeneration` callback (currently lines ~4084–4269) and its `triggerPageGenRef` ref.
- Remove the `NAV_PAGE_GENERATE` `message` listener (inside the `useEffect` at line ~4275). Keep the `NAV_PAGE_RELOAD_REQUIRED` listener untouched.
  - Replace the listener with a no-op that responds to the preview with `NAV_PAGE_ERROR` so the iframe stops waiting:
    ```ts
    if (event.data?.type === 'NAV_PAGE_GENERATE') {
      const source = event.source as Window | null;
      if (source && event.data.requestId) {
        source.postMessage({
          type: 'NAV_PAGE_ERROR',
          requestId: event.data.requestId,
          error: 'Auto-page generation disabled. Add the page in Creator Playground.'
        }, '*');
      }
      return;
    }
    ```
- Delete the `isGeneratingPage` and `currentNavPage` state (lines ~4065–4066).
- Delete the loading overlay JSX block that shows "Generating … / AI is building a matching page with full design context" (lines ~6718–6733).

### 2. Memory

- Update `mem://technical/vfs/just-in-time-scaffolding-policy` to record that runtime AI page generation on button click is removed. Missing routes are now handled solely by the canonical router + deterministic placeholder pages.

## Out of Scope

- `aiGeneratedFiles` Set and any tab/file-explorer "AI" badge plumbing — leave intact (unused state in WebBuilder is harmless and used by other generation flows).
- System Launcher, Creator Playground, route/binding iteration UX.
