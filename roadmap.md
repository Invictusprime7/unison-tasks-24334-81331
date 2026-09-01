# Roadmap

## Open
- [ ] M7 — end-to-end wizard generation walk. Batch isolation fix landed: each Lane B response authors exactly one canonical page, two requests may run concurrently, every response is syntax-gated before merge, malformed groups cannot poison the VFS, unrequested top-level pages cannot leak in as companions, and failed pre-batched work is never redundantly rerun. Next: verify one complete Wizard walk across every generated route.
- [x] Builder theme-token editor (persisted overrides through the canonical commit path)
- [ ] Final consolidation sweep — confirm no parallel body-authoring paths remain; full suite green

## Landed
- M1–M6, M8 (canonical ownership, Stage 4b theming, compiler gate, UI/binding closure, snapshot continuity, telemetry)
- Quarantine scaffolds decommissioned (diagnostic surface only)
