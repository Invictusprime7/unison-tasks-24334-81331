---
name: Builder Intelligence Pipeline
description: BuilderRequestEnvelope drives routing (M1), generation prompt (M2), and post-generation verification/repair (M3) in the AI builder.
type: feature
---

The `BuilderRequestEnvelope` produced by the `builder-request-interpreter` edge function is the authoritative interpretation of every AI builder request. Frontend regexes are hints only — never authoritative classification.

- **Milestone 1 — routing**: `AICodeAssistant.tsx` calls `interpretBuilderRequest` first; `templateActionFromEnvelope` replaces keyword routing. `requestEnvelope` + `skipResearch` are sent to `ai-code-assistant`.
- **Milestone 2 — generation**: `envelopeContext.ts#buildEnvelopeDirective` injects goals, constraints, scope, implied capabilities and ambiguity handling as an authoritative directive block into the final system prompt (server-side, unskippable).
- **Milestone 3 — verification**: `envelopeVerifier.ts#verifyAgainstEnvelope` checks the returned file set against:
  - `scope.targets` (hard gate; skipped when scope level is site/project/global/app),
  - each goal's `acceptanceCriteria` via extracted machine-checkable signals (file paths, `data-ut-intent`, `data-ut-slot`, quoted copy, symbols),
  - `requestedCapabilities` → canonical `data-ut-intent` wiring must exist in returned markup.

  Failure triggers exactly ONE targeted repair turn (`buildRepairInstruction`) restating only the failures; the repair is accepted only if strictly fewer misses. `must`-priority misses and scope violations force `requiresApproval`. The verdict ships to the client as `envelopeVerification` and is surfaced as a toast.

Prose summaries from the model are never trusted as evidence that a goal was implemented.
