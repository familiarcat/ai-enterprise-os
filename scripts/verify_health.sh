#!/usr/bin/env zsh
# AI Enterprise OS - Python Environment Health Check

PROJECT_ROOT=$(dirname "$0")/..
REQ_FILE="$PROJECT_ROOT/requirements.txt"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  Warning: .env file not found at $PROJECT_ROOT/.env"
  echo "   Ensure your credentials are set in the shell or create a .env file."
fi

FIX_MODE=false
if [[ "$1" == "--fix" ]]; then FIX_MODE=true; fi
REBUILD_MODE=false
if [[ "$1" == "--rebuild" || "$2" == "--rebuild" ]]; then REBUILD_MODE=true; fi

if [ "$REBUILD_MODE" = true ]; then
  echo "🗑  Deleting and recreating virtual environment..."
  rm -rf "$PROJECT_ROOT/.venv"
  python3 -m venv "$PROJECT_ROOT/.venv"
  "$PROJECT_ROOT/.venv/bin/pip" install -r "$REQ_FILE"
  echo "✅ Virtual environment rebuilt."
fi

if [ ! -f "$PYTHON_BIN" ]; then
  echo "❌ Error: PYTHON_BIN is not set or the binary does not exist at: $PYTHON_BIN"
  exit 1
fi

echo "🔍 Validating Python dependencies from $REQ_FILE..."

MISSING_COUNT=0
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and empty lines
  [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]] && continue
  
  # Extract package name (ignoring version constraints)
  pkg=$(echo "$line" | sed -E 's/[<>=!~].*//' | xargs)
  
  if ! "$PYTHON_BIN" -m pip show "$pkg" > /dev/null 2>&1; then
    if [ "$FIX_MODE" = true ]; then
      echo "🛠  Missing $pkg. Attempting to install..."
      "$PYTHON_BIN" -m pip install "$pkg"
      if ! "$PYTHON_BIN" -m pip show "$pkg" > /dev/null 2>&1; then
        echo "❌ Failed to install $pkg"
        ((MISSING_COUNT++))
      else
        echo "✅ Successfully installed $pkg"
      fi
    else
      echo "❌ Missing dependency: $pkg"
      ((MISSING_COUNT++))
    fi
  else
    echo "✅ Verified: $pkg"
  fi
done < "$REQ_FILE"

[ $MISSING_COUNT -eq 0 ] && echo "🚀 All Python dependencies are satisfied." || exit 1