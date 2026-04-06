#!/bin/bash
set -e

# ─── CONFIG ───────────────────────────────────────────────
DOMAIN="bki2.pacificpact.com"
APP_DIR="/var/www/html/bki2"
REPO="https://github.com/pactleader/bki2.git"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
NGINX_LINK="/etc/nginx/sites-enabled/$DOMAIN"

echo "==> Deploying $DOMAIN"

# ─── CLONE OR PULL ────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
  echo "==> Pulling latest changes..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "==> Cloning repository..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── BUILD FRONTEND ───────────────────────────────────────
echo "==> Installing frontend dependencies..."
npm install

echo "==> Building frontend for production..."
npm run build

# ─── BUILD ADMIN PANEL ────────────────────────────────────
echo "==> Installing admin panel dependencies..."
cd "$APP_DIR/admin"
npm install

echo "==> Building admin panel for production..."
npm run build

# ─── SERVER (API) ─────────────────────────────────────────
echo "==> Installing server dependencies..."
cd "$APP_DIR/server"
npm install

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
  echo "==> Installing PM2..."
  sudo npm install -g pm2
fi

echo "==> Starting/restarting API server with PM2..."
pm2 restart bki-api 2>/dev/null || pm2 start "$APP_DIR/server/index.js" --name bki-api --env production
pm2 save

# Ensure PM2 starts on server reboot
pm2 startup 2>/dev/null || true

# ─── NGINX CONFIG ─────────────────────────────────────────
echo "==> Configuring Nginx..."
sudo tee "$NGINX_CONF" > /dev/null <<NGINX
# Upstream — Node.js Express server
upstream bki_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL — filled in by certbot
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Block all crawlers (dev site — remove when going live)
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # ── API proxy ──
    location /api/ {
        proxy_pass         http://bki_api;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout    30s;
    }

    # ── Article SSR (server-side rendered for SEO) ──
    location /Articles/ {
        proxy_pass         http://bki_api;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout    30s;
    }

    # ── Uploads ──
    location /uploads/ {
        proxy_pass         http://bki_api;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
    }

    # ── Admin panel ──
    location /admin {
        alias  $APP_DIR/admin/dist;
        index  index.html;
        try_files \$uri \$uri/ $APP_DIR/admin/dist/index.html;
    }

    # ── Frontend (React SPA) ──
    location / {
        root   $APP_DIR/dist;
        index  index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # ── Static asset caching ──
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml application/x-font-ttf font/woff font/woff2;
    gzip_vary on;
    gzip_min_length 1024;
}
NGINX

# Enable site if not already linked
if [ ! -L "$NGINX_LINK" ]; then
  sudo ln -s "$NGINX_CONF" "$NGINX_LINK"
fi

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# ─── SSL WITH LET'S ENCRYPT ──────────────────────────────
echo "==> Setting up SSL with Let's Encrypt..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect 2>/dev/null || true

echo ""
echo "==> Deployment complete!"
echo "==> Frontend: https://$DOMAIN"
echo "==> Admin:    https://$DOMAIN/admin"
echo "==> API:      https://$DOMAIN/api/health"
echo ""
echo "REMINDER: Make sure .env exists at $APP_DIR/.env"
echo "          Run: node $APP_DIR/server/scripts/create-admin.js admin@yourdomain.com yourpassword 'Your Name'"
