#!/usr/bin/env bash
# Docker Preview Service Manager (cross-platform)
# Usage: ./scripts/docker-preview-service.sh {start|stop|status|background}
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PREVIEW_DIR="$PROJECT_ROOT/preview-service"

color() { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()  { color "36" "$1"; }
ok()    { color "32" "$1"; }
warn()  { color "33" "$1"; }
err()   { color "31" "$1"; }

docker_running() { docker info >/dev/null 2>&1; }

get_status() {
  local gw_status
  gw_status=$(docker ps --filter "name=preview-service-gateway" --format "{{.Status}}" 2>/dev/null || echo "")
  local worker_img
  worker_img=$(docker images "unison-preview-worker:latest" --format "{{.Repository}}" 2>/dev/null || echo "")

  echo "Gateway: ${gw_status:-Not running}"
  if [ "$worker_img" = "unison-preview-worker" ]; then
    echo "Worker Image: Available"
  else
    echo "Worker Image: Not built"
  fi
}

start_service() {
  local detached="${1:-false}"

  info "========================================="
  info "  Starting Docker Preview Service"
  info "========================================="

  if ! docker_running; then
    err "Docker is not running. Please start Docker first."
    exit 1
  fi

  cd "$PREVIEW_DIR"
  warn "Building preview service images..."
  docker-compose build --quiet

  if [ "$detached" = "true" ]; then
    warn "Starting preview service (detached)..."
    docker-compose up -d
  else
    warn "Starting preview service..."
    docker-compose up
  fi

  ok "✓ Preview service is running at http://localhost:3001"
}

stop_service() {
  warn "Stopping preview service..."
  cd "$PREVIEW_DIR"
  docker-compose down
  ok "✓ Preview service stopped"
}

show_status() {
  info "========================================="
  info "  Preview Service Status"
  info "========================================="

  if docker_running; then
    ok "Docker: Running"
  else
    err "Docker: Not running"
    return
  fi

  get_status

  warn "Testing gateway endpoint..."
  if curl -sf --max-time 5 http://localhost:3001/health >/dev/null 2>&1; then
    ok "Health Check: OK"
  else
    err "Health Check: Failed"
  fi
}

background_monitor() {
  start_service true
  warn "Monitoring service health... (Ctrl+C to stop)"

  local check_interval=30
  local restarts=0
  local max_restarts=5

  while true; do
    sleep "$check_interval"
    gw=$(docker ps --filter "name=preview-service-gateway" --format "{{.Status}}" 2>/dev/null || echo "")
    if [ -z "$gw" ] || ! echo "$gw" | grep -q "Up"; then
      warn "[$(date +%H:%M:%S)] Gateway down, restarting..."
      restarts=$((restarts + 1))
      if [ "$restarts" -ge "$max_restarts" ]; then
        err "Too many restarts ($max_restarts). Stopping monitor."
        break
      fi
      cd "$PREVIEW_DIR" && docker-compose up -d
      ok "[$(date +%H:%M:%S)] Restarted (attempt $restarts/$max_restarts)"
    else
      restarts=0
    fi
  done
}

case "${1:-help}" in
  start)      start_service false ;;
  stop)       stop_service ;;
  status)     show_status ;;
  background) background_monitor ;;
  *)
    echo "Usage: $0 {start|stop|status|background}"
    echo ""
    echo "Commands:"
    echo "  start       Start preview service (foreground)"
    echo "  stop        Stop preview service"
    echo "  status      Show service status"
    echo "  background  Start + monitor in background"
    ;;
esac
