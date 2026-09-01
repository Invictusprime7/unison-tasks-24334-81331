# Roadmap

## Open
- [ ] M7 — end-to-end wizard generation walk. Batch isolation fix landed: each Lane B response authors exactly one canonical page, two requests may run concurrently, each page receives the full isolated-page provider allowance instead of the stale ~78s planner estimate, every response is syntax-gated before merge, and unrequested pages cannot leak in as companions. Next: verify one complete Wizard walk across every generated route.
- [x] Builder theme-token editor (persisted overrides through the canonical commit path)
- [ ] Final consolidation sweep — confirm no parallel body-authoring paths remain; full suite green

## Landed
- M1–M6, M8 (canonical ownership, Stage 4b theming, compiler gate, UI/binding closure, snapshot continuity, telemetry)
- Quarantine scaffolds decommissioned (diagnostic surface only)
