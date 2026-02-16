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

# ─── BUILD ────────────────────────────────────────────────
echo "==> Installing dependencies..."
npm install

echo "==> Building for production..."
npm run build

# ─── NGINX CONFIG ─────────────────────────────────────────
echo "==> Configuring Nginx..."
sudo tee "$NGINX_CONF" > /dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    # Block all crawlers/indexing (dev site only)
    add_header X-Robots-Tag "noindex, nofollow" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
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
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect

echo ""
echo "==> Deployment complete!"
echo "==> Site live at https://$DOMAIN"
