# Using Node 20 as established in AI_ENTERPRISE_OS_ANALYSIS.md
FROM node:20-bookworm-slim

WORKDIR /app

# Install Python 3.11 and dependencies for CrewAI
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Copy workspace configuration and install Node dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY core/package.json ./core/
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the Next.js dashboard
# Assuming next.config.js has output: 'export', build will create 'out' directory
RUN pnpm --filter @apps/dashboard build

# Initialize Python Virtual Environment and Install CrewAI
RUN bash scripts/setup-python.sh

EXPOSE 3002


CMD ["node", "apps/api/mcp-http-bridge.mjs"]