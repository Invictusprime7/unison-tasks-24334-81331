# Preview Service

Production-grade live preview system using ECS Vite containers with HMR support.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Frontend  │────▶│   Gateway   │────▶│  Vite Workers   │
│  (Browser)  │     │   (Express) │     │  (Docker/ECS)   │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                   │                     │
       │                   ▼                     │
       │            ┌─────────────┐              │
       └───────────▶│   iframe    │◀─────────────┘
                    │  (Preview)  │
                    └─────────────┘
```

## Components

### Gateway (`/gateway`)
Express.js API server that:
- Manages preview session lifecycle
- Spawns/stops Vite worker containers
- Proxies preview requests to workers
- Handles file patches for HMR

### Worker (`/worker`)
Vite dev server container that:
- Runs React + TypeScript projects
- Provides Hot Module Replacement
- Includes pre-installed dependencies

## Quick Start (Local Development)

```bash
# Start the preview service
./scripts/local-dev.sh

# Or manually with Docker Compose
docker compose up -d
```

The gateway will be available at `http://localhost:3001`

## API Endpoints

### Create Session
```bash
POST /api/preview/start
Content-Type: application/json

{
  "projectId": "my-project",
  "files": {
    "/index.html": "<!DOCTYPE html>...",
    "/src/App.tsx": "import React...",
    "/src/main.tsx": "import ReactDOM..."
  }
}
```

Response:
```json
{
  "success": true,
  "session": {
    "id": "abc-123",
    "iframeUrl": "http://localhost:3001/preview/abc-123",
    "status": "running"
  }
}
```

### Patch File (HMR)
```bash
PATCH /api/preview/{sessionId}/file
Content-Type: application/json

{
  "path": "/src/App.tsx",
  "content": "// Updated content..."
}
```

### Get Logs
```bash
GET /api/preview/{sessionId}/logs
```

### Keep Alive
```bash
POST /api/preview/{sessionId}/ping
```

### Stop Session
```bash
POST /api/preview/{sessionId}/stop
```

## AWS Deployment

### Prerequisites
- AWS CLI configured
- Terraform installed
- Docker installed

### Deploy Infrastructure

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Plan changes
terraform plan -var-file="production.tfvars"

# Apply
terraform apply -var-file="production.tfvars"
```

### Deploy Application

```bash
./scripts/deploy.sh production
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Gateway port |
| `GATEWAY_URL` | `http://localhost:3001` | Public gateway URL |
| `PREVIEW_IMAGE` | `unison-preview-worker:latest` | Worker Docker image |
| `MAX_SESSIONS` | `50` | Maximum concurrent sessions |
| `SESSION_TIMEOUT` | `300000` | Session timeout (5 min) |
| `CONTAINER_NETWORK` | `preview-network` | Docker network |
| `LOG_LEVEL` | `info` | Logging level |

## Frontend Integration

Update the frontend to use the deployed preview service:

```env
# .env.production
VITE_PREVIEW_API_URL=https://preview.unison.app/api/preview
```

Then enable runtime mode in SimplePreview:

```tsx
<SimplePreview
  files={files}
  projectId={projectId}
  enableRuntime={true}
  disableRuntime={false}
/>
```

## Monitoring

- CloudWatch Logs: `/ecs/unison-preview-gateway`
- CloudWatch Metrics: ECS Service metrics
- Health endpoint: `GET /health`

## Troubleshooting

### Container fails to start
Check the CloudWatch logs for the worker container.

### Session times out quickly
Ensure the frontend is calling `/ping` every 30 seconds.

### HMR not working
Verify WebSocket connection to the gateway.
