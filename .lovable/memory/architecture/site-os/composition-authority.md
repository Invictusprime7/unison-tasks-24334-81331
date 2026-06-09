---
name: Composition Authority
description: SiteBundle composition owns section presence/count/items/layout; topology owns page identity; variation is style-only. Forbids first-match-wins collapsing and randomized section presence.
type: feature
---

# Composition Authority

The Execution Hierarchy `Contracts > Schemas > SiteBundle > Runtime > UI` is enforced in code as follows:

## Authority split

- **Topology** (`siteTopologyPlanner` / `PageRegistry`) owns: page identity, route, nav order, role assignment.
- **SiteBundle composition** (`SiteBundleSnapshot.composition.sections[]`) owns: section *presence*, section *count*, per-section item arrays (`items` / `cards` / `products` / `gallery` / `testimonials`), and per-section layout tokens.
- **Design variation** (`generateDesignVariation`) owns: visual style only — spacing, button shape, image treatment, hover effects, background flourishes. **Never** section presence, **never** section removal, **never** item-count caps.

## Hard rules

1. **No `Map<SectionType, SectionEntry>` "first match wins" collapsing.** When filtering sections by an allowed-type set, iterate the source array in order and keep every match. Each duplicate gets a unique `id` so React keys + intent slot coordinates stay distinct. See `buildRoleComposition` in `src/utils/topologyVFSScaffolder.ts`.

2. **No `sections.use_*` boolean coinflips.** `DesignVariation.sections.include_*` flags are hard-coded `true`. The randomizer must never strip a section the bundle declared. Only `use_counter_animations` remains a style coinflip.

3. **No `.slice(0, N)` caps in item renderers.** `PageRenderer.tsx` `Services` / `Testimonials` / `Team` / `FAQ` / `Stats` / `Footer` map the full `items` array. Adding a cap silently truncates bundle content.

4. **Layout tokens flow through.** `SectionEntry.props.layout` is consumed by the section component itself (Hero, Services, Features, etc). Top-level `composition.layout` flourishes get emitted on section wrappers.

## Why

Wizard already generates rich bundles (feature-card grids, product collections, gallery items, floating flex layouts). Earlier the post-bundle pipeline flattened them — `buildRoleComposition` deduped to one section per type, and `designVariation` coinflipped sections off. Result: sparse skeleton pages regardless of bundle richness. Inverting authority so the bundle wins makes preview match what the wizard produced.
