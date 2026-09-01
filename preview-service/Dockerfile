# Preview Service - Vite Runtime Container
# Runs a Vite dev server with HMR for live preview

FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S preview && \
    adduser -S preview -u 1001 -G preview

# Create sessions directory with correct ownership
RUN mkdir -p /sessions && chown -R preview:preview /sessions

# Install pnpm for faster installs
RUN npm install -g pnpm vite @vitejs/plugin-react

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy the entrypoint script (from worker context)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy the rest of the application
COPY . .

# Set ownership
RUN chown -R preview:preview /app /entrypoint.sh

# Switch to non-root user
USER preview

# Expose Vite port
EXPOSE 4173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4173 || exit 1

# Start with entrypoint that installs deps and runs Vite
ENTRYPOINT ["/entrypoint.sh"]
