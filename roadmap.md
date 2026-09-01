# Roadmap

## Open
- [ ] M7 — end-to-end wizard generation walk. Blocker: Lane B batch responses intermittently quarantined by the pre-binding syntax gate, forcing slow isolated completions (and one fatal `Booking.tsx` failure). Verified NOT a truncation/parse bug: a captured 8-page Lane B response replayed offline through `sanitizeGeneratedFiles` → import healer → `runPreflightRepair` came back 8/8 clean. Next: capture the *batch* responses that actually quarantine (the launcher now logs `Early syntax repair` details as JSON instead of a collapsed object).
- [x] Builder theme-token editor (persisted overrides through the canonical commit path)
- [ ] Final consolidation sweep — confirm no parallel body-authoring paths remain; full suite green

## Landed
- M1–M6, M8 (canonical ownership, Stage 4b theming, compiler gate, UI/binding closure, snapshot continuity, telemetry)
- Quarantine scaffolds decommissioned (diagnostic surface only)
