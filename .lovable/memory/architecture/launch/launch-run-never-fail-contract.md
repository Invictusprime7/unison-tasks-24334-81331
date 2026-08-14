---
name: Launch Run never-fail contract
description: Wizard → Web Builder journey is governed by launchRun; only session loss is fatal, everything else degrades to the wizard seed and still hands off.
type: feature
---

`src/services/launch/launchRun.ts` owns the Wizard → Web Builder journey
(`plan → seed → enrich → preflight → commit → handoff`).

Rules:
- **Never block:** every stage carries its own watchdog and yields to the browser
  on a 12ms frame budget. There is no single global launch watchdog anymore.
- **Never toast:** the wizard shows a dismissible inline banner (`launchError`),
  never `toast.error`. Non-fatal issues are recorded via `run.degrade(...)`.
- **Fatal = session loss only** (`classifyLaunchError`). Rate limits, transport
  errors, provider timeouts, contract misses, publish-readiness gaps and commit
  lag are all degradations.
- **AI enrichment is optional by contract.** When Lane B fails, the run falls
  back to `siteBundleSnapshot.vfsFiles` — the wizard's own deterministic seed
  (industry composition + selected template + theme tokens + selected pages).
  This is NOT the forbidden minimal preset fallback.
- **Handoff is guaranteed.** A missing persisted revision degrades to a local
  draft; the builder still opens. Degradations travel via
  `publishLaunchDegradations` and render in `LaunchDegradationNote`.
