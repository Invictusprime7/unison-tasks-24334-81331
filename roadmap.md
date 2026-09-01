# Roadmap

## Open
- [ ] M7 — end-to-end wizard generation walk. Batch isolation fix landed: bounded two-group waves are syntax-gated before merge, malformed groups cannot poison the VFS, unrequested top-level pages cannot leak in as companions, and a failed pre-batched pass no longer reruns the same four groups before targeted completion. Next: verify one complete Wizard walk across every generated route.
- [x] Builder theme-token editor (persisted overrides through the canonical commit path)
- [ ] Final consolidation sweep — confirm no parallel body-authoring paths remain; full suite green

## Landed
- M1–M6, M8 (canonical ownership, Stage 4b theming, compiler gate, UI/binding closure, snapshot continuity, telemetry)
- Quarantine scaffolds decommissioned (diagnostic surface only)
