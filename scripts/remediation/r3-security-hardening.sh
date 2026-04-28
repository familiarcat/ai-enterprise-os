#!/bin/bash
# Phase R3: Hardening | Assigned: Lt. Worf
echo "⚔️ Worf: Installing security gates and locking permissions..."

if [ -d ".git" ]; then
    mkdir -p .git/hooks
    cat > .git/hooks/pre-commit <<EOF
#!/bin/bash
node core/worf-pre-commit.js
EOF
    chmod +x .git/hooks/pre-commit
fi
chmod 600 .env 2>/dev/null || true
echo "Security gates active."