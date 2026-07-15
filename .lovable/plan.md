
## Goal
Let creators explicitly choose which Business Profile a wizard-generated project is saved under, then move it later — from the Web Builder topbar and from Cloud Settings. Enforce that only business admins/owners can move projects.

## 1. Backend (single migration)

**`user_business_role(user_id, business_id)`** — SECURITY DEFINER, returns text (`owner` | `admin` | `member` | null). Derived from `businesses.owner_id` (=`owner`) or `business_members.role`.

**`is_business_admin(user_id, business_id)`** — SECURITY DEFINER boolean = role in (`owner`,`admin`).

**`reassign_project_business(_project_id uuid, _target_business_id uuid)`** — SECURITY DEFINER. Verifies caller is admin on both source (current `projects.business_id`, if any) and target, then:
- updates `public.projects.business_id`
- updates `public.builder_drafts.business_id` where `project_id = _project_id`
Raises exception with clear message on failure.

No new tables. RLS on projects/builder_drafts already covers reads through business membership.

## 2. Shared UI primitive

`src/components/business/BusinessSelector.tsx`
- Props: `value`, `onChange`, `mode: 'admin' | 'member'`, `allowCreate?: boolean`, `size?: 'sm'|'md'`.
- Lists businesses where the current user is admin/owner (from `business_members` + `businesses.owner_id`). In `mode='member'` (wizard/create), includes plain members too.
- `allowCreate` renders an inline "+ New business" row that opens a small modal creating a `businesses` row (name, industry) and auto-selects it.
- Dark-themed, shadcn `Popover + Command` pattern.

## 3. Wizard integration (SystemLauncher)

- Add `businessId?: string` to `WizardSelections` and thread through `createLaunchState` (spread already preserves it).
- In `src/components/onboarding/SystemLauncher.tsx` step 1 header row (next to `WizardTopAction`), mount `<BusinessSelector mode="member" allowCreate />`. Default = last-used business from localStorage, else first membership.
- On Generate: write `businessId` into `LaunchState.businessId` and pass to draft persistence — `sync_draft_to_project` trigger already uses `NEW.business_id` to stamp the project.

## 4. Web Builder topbar pill

`src/components/webbuilder/BusinessPill.tsx`
- Reads `BuilderSessionContext.businessId + projectId`.
- Shows business name + small chevron. Click → popover with `<BusinessSelector mode="admin" />`. Selecting a different business calls `reassign_project_business` RPC, toasts result, updates local session context via `updateLaunch({ businessId })`.
- Non-admins see a locked pill (tooltip: "Business admins can move this project").
- Mounted next to the project-name in `WebBuilder`'s topbar (single line insertion).

## 5. Cloud Settings — Projects section

Extend `src/pages/Settings.tsx` with a new "Projects & businesses" card:
- Table: Project name · Current business · Updated · Action.
- Each row's business cell renders `<BusinessSelector mode="admin" allowCreate />` bound to that project — calls the RPC on change.
- Empty state guides user to launch a project or create a business.

## 6. Files touched (net-new + edits)

New:
- `supabase/migrations/<ts>_business_reassignment.sql`
- `src/components/business/BusinessSelector.tsx`
- `src/components/business/CreateBusinessInline.tsx`
- `src/components/webbuilder/BusinessPill.tsx`
- `src/services/businessMembership.ts` (single fetcher + RPC wrapper)

Edited:
- `src/types/playground.ts` — add `businessId?` to `WizardSelections`
- `src/components/onboarding/SystemLauncher.tsx` — mount selector in step 1 header + pass into launch
- `src/components/WebBuilder.tsx` (or its extracted topbar) — mount `BusinessPill`
- `src/pages/Settings.tsx` — add Projects & Businesses card

## 7. Verification
- Type check + a quick Playwright pass hitting `/web-builder` and `/settings` to confirm pill + settings card render with the current user's businesses.

Nothing in the canonical wizard/Lane B pipeline changes. Only additive metadata on `LaunchState` + a targeted RPC for post-generation moves.
