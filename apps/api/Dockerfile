# Dockerfile for the MCP Server (Node.js + Python)
# This image will run the mcp-http-bridge.mjs and orchestrator.js

# Use a Node.js 20 base image
FROM node:20-slim AS base

# Install Python 3.11 and pip
FROM base AS python-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set Python as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Install Python dependencies for CrewAI
COPY tools/requirements-dev.txt /app/tools/requirements-dev.txt
RUN pip install --no-cache-dir -r /app/tools/requirements-dev.txt

# Copy application code
FROM python-deps AS final
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY core/package.json core/
COPY tools/ tools/
COPY apps/api/mcp-http-bridge.mjs apps/api/
COPY core/orchestrator.js core/

# Install pnpm and Node.js dependencies
RUN npm install -g pnpm@8.15.4
RUN pnpm install --prod --filter @apps/api

# Expose the MCP Bridge port
EXPOSE 3002

# Set the Python binary path for the orchestrator
ENV PYTHON_BIN=/usr/bin/python3
ENV MCP_BRIDGE_PORT=3002

# Command to run the MCP HTTP Bridge
CMD ["node", "apps/api/mcp-http-bridge.mjs"]