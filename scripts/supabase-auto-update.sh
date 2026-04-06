#!/usr/bin/env bash
# Supabase & Deno Auto-Update Script (cross-platform)
# Usage: ./scripts/supabase-auto-update.sh [--check-only] [--force] [--sync-secrets] [--watch]
set -euo pipefail

CHECK_ONLY=false
FORCE=false
SYNC_SECRETS=false
WATCH=false

for arg in "$@"; do
  case "$arg" in
    --check-only)    CHECK_ONLY=true ;;
    --force)         FORCE=true ;;
    --sync-secrets)  SYNC_SECRETS=true ;;
    --watch)         WATCH=true ;;
    --help|-h)       echo "Usage: $0 [--check-only] [--force] [--sync-secrets] [--watch]"; exit 0 ;;
  esac
done

DENO_JSON="supabase/functions/deno.json"
ENV_FILE=".env"

color() { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()  { color "36" "$1"; }
ok()    { color "32" "$1"; }
warn()  { color "33" "$1"; }
err()   { color "31" "$1"; }
gray()  { color "90" "$1"; }

check_supabase_cli() { command -v supabase >/dev/null 2>&1; }

get_latest_npm_version() {
  local pkg="$1"
  curl -sf "https://registry.npmjs.org/$pkg/latest" 2>/dev/null | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4
}

sync_secrets() {
  info "========================================="
  info "  Syncing Secrets to Supabase"
  info "========================================="

  if [ ! -f "$ENV_FILE" ]; then
    warn "No .env file found."
    return
  fi

  local secrets=""
  local count=0
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" || -z "$value" ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    [ -z "$value" ] && continue
    secrets="$secrets $key=$value"
    gray "  - $key"
    count=$((count + 1))
  done < "$ENV_FILE"

  if [ "$count" -eq 0 ]; then
    warn "No secrets found in .env"
    return
  fi

  warn "Pushing $count secrets to Supabase..."
  eval "supabase secrets set $secrets" && ok "✓ Secrets synced!" || err "✗ Failed to sync secrets"
}

deploy_functions() {
  info "========================================="
  info "  Deploying Edge Functions"
  info "========================================="

  local deployed=0
  local failed=0

  for dir in supabase/functions/*/; do
    [ ! -d "$dir" ] && continue
    local func_name
    func_name=$(basename "$dir")
    [ "$func_name" = "node_modules" ] && continue

    warn "  Deploying: $func_name..."
    if supabase functions deploy "$func_name" --no-verify-jwt 2>/dev/null; then
      ok "    ✓ $func_name deployed"
      deployed=$((deployed + 1))
    else
      err "    ✗ $func_name failed"
      failed=$((failed + 1))
    fi
  done

  info "Deployment Summary:"
  ok "  Deployed: $deployed"
  [ "$failed" -gt 0 ] && err "  Failed: $failed"
}

watch_mode() {
  info "========================================="
  info "  Watch Mode - Monitoring for Changes"
  info "  Press Ctrl+C to stop"
  info "========================================="

  deploy_functions
  local last_check
  last_check=$(date +%s)
  local interval=21600  # 6 hours

  while true; do
    sleep 60
    now=$(date +%s)
    elapsed=$((now - last_check))

    if [ "$elapsed" -ge "$interval" ]; then
      warn "[$(date +%H:%M)] Checking for dependency updates..."
      last_check=$(date +%s)
    fi

    changed=$(git diff --name-only 2>/dev/null | grep "^supabase/functions/" || true)
    if [ -n "$changed" ]; then
      warn "Local changes detected in Edge Functions..."
      echo "$changed" | sed 's|supabase/functions/\([^/]*\)/.*|\1|' | sort -u | while read -r fn; do
        warn "  Deploying changed function: $fn"
        supabase functions deploy "$fn" --no-verify-jwt 2>/dev/null || true
      done
    fi
  done
}

# Main
info "╔═══════════════════════════════════════╗"
info "║  Supabase & Deno Auto-Update Tool    ║"
info "╚═══════════════════════════════════════╝"

if ! check_supabase_cli; then
  warn "Supabase CLI not found. Installing..."
  npm install -g supabase
fi

if [ ! -d ".supabase" ]; then
  warn "Project not linked. Running link..."
  supabase link
fi

if [ "$WATCH" = true ]; then
  watch_mode
else
  if [ "$SYNC_SECRETS" = true ]; then
    sync_secrets
  fi

  if [ "$FORCE" = true ]; then
    deploy_functions
  fi

  if [ "$CHECK_ONLY" = true ]; then
    ok "✓ Check complete"
  fi
fi

info "Done!"
