#!/usr/bin/env bash
# Vercel Auto-Deploy Script (cross-platform)
# Usage: ./scripts/vercel-deploy.sh [--watch] [--production] [--force]
set -euo pipefail

WATCH=false
PRODUCTION=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --watch) WATCH=true ;;
    --production) PRODUCTION=true ;;
    --force) FORCE=true ;;
    --help|-h) echo "Usage: $0 [--watch] [--production] [--force]"; exit 0 ;;
  esac
done

color() { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()  { color "36" "$1"; }
ok()    { color "32" "$1"; }
warn()  { color "33" "$1"; }
err()   { color "31" "$1"; }

check_vercel() { command -v vercel >/dev/null 2>&1; }

deploy() {
  info "========================================="
  info "  Deploying to Vercel..."
  info "========================================="

  status=$(git status --porcelain 2>/dev/null || true)
  if [ -n "$status" ] && [ "$FORCE" = false ]; then
    warn "Uncommitted changes detected. Committing..."
    git add -A
    git commit -m "Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')" || { err "Git commit failed"; return 1; }
  fi

  warn "Pushing to remote..."
  git push origin main 2>/dev/null || warn "Push failed or no remote. Deploying directly..."

  if [ "$PRODUCTION" = true ]; then
    warn "Deploying to PRODUCTION..."
    vercel --prod --yes
  else
    warn "Deploying preview..."
    vercel --yes
  fi

  ok "✓ Deployment successful!"
}

watch_and_deploy() {
  info "========================================="
  info "  Vercel Watch Mode"
  info "  Monitoring for changes..."
  info "  Press Ctrl+C to stop"
  info "========================================="

  last_deploy=$(date +%s)
  debounce=30

  while true; do
    sleep 5
    status=$(git status --porcelain 2>/dev/null || true)
    if [ -n "$status" ]; then
      now=$(date +%s)
      elapsed=$((now - last_deploy))
      if [ "$elapsed" -ge "$debounce" ]; then
        warn "Changes detected. Deploying in 5 seconds..."
        sleep 5
        status=$(git status --porcelain 2>/dev/null || true)
        if [ -n "$status" ]; then
          deploy
          last_deploy=$(date +%s)
          info "Continuing to watch for changes..."
        fi
      fi
    fi
  done
}

# Main
info "╔═══════════════════════════════════════╗"
info "║     Unison Tasks Vercel Deployer     ║"
info "╚═══════════════════════════════════════╝"

if ! check_vercel; then
  warn "Vercel CLI not found. Installing..."
  npm install -g vercel
fi

warn "Checking Vercel authentication..."
whoami=$(vercel whoami 2>&1) || { warn "Not logged in. Running login..."; vercel login; }
ok "Logged in as: $whoami"

if [ ! -d ".vercel" ]; then
  warn "Project not linked. Running link..."
  vercel link
fi

if [ "$WATCH" = true ]; then
  watch_and_deploy
else
  deploy
fi
