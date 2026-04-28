#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# scripts/lib/crew-utils.sh — Sovereign Factory Shared Utilities
# ═══════════════════════════════════════════════════════════════════════════════

# Robustly extracts a credential from ~/.zshrc
get_credential() {
  local key="$1"
  local zshrc="${HOME}/.zshrc"
  grep -E "^export ${key}=" "$zshrc" 2>/dev/null \
    | sed -E "s/^export ${key}=[\"']?([^\"']+)[\"']?/\1/" \
    | tail -1 || echo ""
}

# Safely sets or updates a key in an env file (cross-platform safe)
set_env_var() {
  local key="$1" val="$2" file="$3"
  touch "$file"
  if grep -q "^${key}=" "$file"; then
    sed "s|^${key}=.*|${key}=${val}|" "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

# Safely sets or updates a key in ~/.zshrc
set_zshrc_var() {
  local key="$1" val="$2" zshrc="${HOME}/.zshrc"
  if grep -q "export ${key}=" "$zshrc"; then
    sed "s|export ${key}=.*|export ${key}=\"${val}\"|" "$zshrc" > "${zshrc}.tmp" && mv "${zshrc}.tmp" "$zshrc"
  else
    printf "\n# AI Enterprise OS - %s\nexport %s=\"%s\"\n" "$key" "$key" "$val" >> "$zshrc"
  fi
}

# Centralized Docker Check & Auto-Start
ensure_docker() {
  local persona="${1:-chief_obrien}"
  local step="${2:-docker-check}"

  if ! command -v docker &>/dev/null; then
    crew_fail --step "$step" --persona "$persona" --tool "health_check" \
      --context "Docker CLI not found on PATH." --error "Install Docker Desktop: https://docs.docker.com/desktop/"
    return 1
  fi

  if ! docker info &>/dev/null; then
    echo "🐳 Chief O'Brien: Docker daemon not running. Attempting to engage..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open -a Docker
      echo "  Waiting for Docker Desktop to initialize (up to 30s)..."
      for i in {1..30}; do
        if docker info &>/dev/null; then
          echo "  ✔ Docker is now online and operational."
          return 0
        fi
        sleep 1
      done
    fi

    crew_fail --step "$step" --persona "$persona" --tool "health_check" \
      --context "Docker daemon is unreachable. Automatic startup failed or is unsupported on this OS." \
      --error "Please start Docker Desktop manually and re-run the pipeline."
    return 1
  fi
  echo "  ✔ Docker daemon is healthy"
  return 0
}