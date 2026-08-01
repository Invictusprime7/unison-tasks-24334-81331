---
name: Site graph schema contract
description: provision-launch-site requires the sites/site_builds/site_bundles/site_runtime_configs/site_capabilities/usage_events/form_definitions/onboarding_state tables plus projects.site_id and builder_drafts.site_id; missing any of them silently rolls back every launch.
type: feature
---

# Site graph schema contract

`supabase/functions/provision-launch-site` writes the entire launch inside ONE transaction:
businesses → business_members → sites → projects → site_data_bindings → form_definitions →
site_builds → site_bundles → sites.current_build_id → site_runtime_configs → builder_drafts →
site_capabilities → usage_events.

If **any** of those relations or columns is missing, the transaction rolls back and the whole
launch persists nothing — the WebBuilder then hydrates an empty draft and Sandpack paints a
blank canvas. This is exactly what happened on 2026-08-01 (the site-graph tables had never been
migrated; 9 launches produced drafts with `vfs_files = {}` and 0 `site_revisions`).

Required columns beyond the base tables: `projects.site_id`, `builder_drafts.site_id`.

## Durability gate

`provisionConfirmedLaunchSite` (src/services/confirmedLaunchProvisioner.ts) now reads
`builder_drafts.vfs_files` back after provisioning and throws when it is empty. A launch is not
real until the generated VFS is readable out of the database.

## Rule

Any new write added to the provisioner must ship with its migration in the same change, and RLS
helper functions used inside policies (`is_project_member`, `is_business_member`,
`is_business_admin`, `user_business_role`, `has_role`) must keep `GRANT EXECUTE ... TO
authenticated, service_role`.
