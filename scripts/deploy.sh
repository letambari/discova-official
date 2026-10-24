#!/bin/bash
# ========================================================
# Discova Africa Tech — Bulletproof cPanel Auto-Deployment
# ========================================================
REPO_DIR="/home2/budracad/repositories/discova-official"
APP_DIR="/home2/budracad/godiscova.com"

# Always ensure the webroot permissions are correct first
chmod 755 "$APP_DIR" 2>/dev/null || true
[ -f "$APP_DIR/.htaccess" ] && chmod 644 "$APP_DIR/.htaccess" 2>/dev/null || true

cd "$REPO_DIR" || exit 1

# Check for new commits on GitHub
git fetch origin main >/dev/null 2>&1

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ] && [ -n "$REMOTE" ]; then
    echo "[$(date)] New commit detected ($REMOTE). Deploying..."
    git pull origin main >/dev/null 2>&1

    # Copy files WITHOUT overwriting directory permissions (no -a on root)
    cp -R "$REPO_DIR"/* "$APP_DIR"/ 2>/dev/null || true
    [ -f "$REPO_DIR/app.js" ] && cp "$REPO_DIR/app.js" "$APP_DIR/app.js"

    # Enforce safe LiteSpeed permissions
    chmod 755 "$APP_DIR"
    chmod 644 "$APP_DIR"/*.html "$APP_DIR"/*.json "$APP_DIR"/app.js 2>/dev/null || true
    chmod -R 755 "$APP_DIR"/css "$APP_DIR"/js "$APP_DIR"/images "$APP_DIR"/server "$APP_DIR"/scripts 2>/dev/null || true
    [ -f "$APP_DIR/.htaccess" ] && chmod 644 "$APP_DIR/.htaccess"

    # Signal Phusion Passenger to reload
    mkdir -p "$APP_DIR/tmp"
    touch "$APP_DIR/tmp/restart.txt"
    echo "[$(date)] Deployment finished cleanly."
fi
