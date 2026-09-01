#!/bin/sh
set -e

WORK_DIR="${PWD}"
echo "Working directory: $WORK_DIR"

# If running from a session directory, need to use pre-installed modules from /app
# Since the session dir is root-owned, we run vite from /app and set the base path
if [ "$WORK_DIR" != "/app" ] && [ -d "/app/node_modules" ]; then
  echo "Session mode - copying files to /app/session-work..."
  # Copy session files to a sub-directory in /app (which we can write to)
  rm -rf /app/session-work
  cp -r "$WORK_DIR" /app/session-work
  cd /app/session-work
  # Symlink base node_modules as starting point
  ln -sf /app/node_modules ./node_modules
fi

# ── Dynamic dependency installation ──────────────────────────────────
# If a package.json exists, compare its dependencies against the
# pre-installed modules and install anything missing.
if [ -f "package.json" ]; then
  echo "Checking for new dependencies..."
  # Use pnpm to install — it's already globally available in the image.
  # --prefer-offline  → use cache first, only fetch what's missing
  # --no-frozen-lockfile → allow installing without a lockfile
  # --ignore-scripts  → skip postinstall scripts for speed & security
  pnpm install --prefer-offline --no-frozen-lockfile --ignore-scripts 2>&1 || {
    echo "WARNING: pnpm install failed, falling back to pre-installed modules"
    # Re-symlink base modules so Vite can at least start
    ln -sf /app/node_modules ./node_modules
  }
  echo "Dependency installation complete."
fi

# List files for debugging
echo "Final working directory: $PWD"
echo "Contents:"
ls -la

echo "Starting Vite dev server on port 4173..."
exec npx vite --host 0.0.0.0 --port 4173
