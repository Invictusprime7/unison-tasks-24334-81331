#!/usr/bin/env bash
# Setup Git Hooks for Auto-Deploy (cross-platform)
# Usage: ./scripts/setup-git-hooks.sh [--remove]
set -euo pipefail

HOOK_DIR=".git/hooks"

color() { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()  { color "36" "$1"; }
ok()    { color "32" "$1"; }
warn()  { color "33" "$1"; }
err()   { color "31" "$1"; }

if [ ! -d ".git" ]; then
  err "Error: Not a git repository"
  exit 1
fi

if [ "${1:-}" = "--remove" ]; then
  warn "Removing git hooks..."
  rm -f "$HOOK_DIR/post-commit"
  ok "Git hooks removed."
  exit 0
fi

info "╔═══════════════════════════════════════╗"
info "║   Setting up Auto-Deploy Git Hooks    ║"
info "╚═══════════════════════════════════════╝"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/post-commit" << 'HOOK'
#!/bin/sh
# Auto-deploy to Vercel after commit

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Auto-deploying to Vercel...         ║"
echo "╚═══════════════════════════════════════╝"
echo ""

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo "Not on main/master branch. Skipping production deploy."
    exit 0
fi

echo "Pushing to origin..."
git push origin "$BRANCH" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Push failed or no remote. Deploying directly..."
    vercel --prod --yes
fi

echo ""
echo "✓ Deployment triggered!"
HOOK

chmod +x "$HOOK_DIR/post-commit"
ok "Created post-commit hook"

info ""
info "✓ Auto-deploy hooks installed!"
info ""
info "How it works:"
info "1. Make changes to your code"
info "2. Commit: git commit -am 'Your message'"
info "3. Hook auto-pushes and triggers Vercel deployment"
info ""
info "To remove: ./scripts/setup-git-hooks.sh --remove"
