#!/bin/bash
# SaaS 控制台静态部署（saas.makestoryforge.com，服务器目录 /home/saas）
#
# 整体布局见仓库根目录 DEPLOY_LAYOUT.md
# 本地先生产构建（npm run build 使用 .env.server）：
#   cd saas && npm run build && cd dist && zip -r ../dist.zip . && cd ..
#
# 前后端分机：API 仍走 https://ai.gaobobo.cn；可选 deploy.env 配置 rsync SSH
#   cd /home/saas && bash deploy-static.sh
#
# 静态下载目录（与 dist 同级，不随前端 build）：
#   /home/saas/downloads/群发助手.zip  — 群发助手（融媒宝）
#   下载地址示例：https://${MAIN_SERVER_NAME}/downloads/群发助手.zip

if [ -f ./deploy.env ]; then
  set -a
  # shellcheck source=/dev/null
  . ./deploy.env
  set +a
fi

# 泛域证书目录名（*.makestoryforge.com 与 saas.makestoryforge.com 共用）
TENANT_WILDCARD_DOMAIN="${TENANT_WILDCARD_DOMAIN:-makestoryforge.com}"
MAIN_SERVER_NAME="${MAIN_SERVER_NAME:-saas.${TENANT_WILDCARD_DOMAIN}}"
# Backend 域名不变，前端 Nginx 反代到此（非内网 IP）
BACKEND_ORIGIN="${BACKEND_ORIGIN:-https://ai.gaobobo.cn}"
BACKEND_PROXY_HOST="${BACKEND_PROXY_HOST:-ai.gaobobo.cn}"
DIST_ROOT="${DIST_ROOT:-/home/saas/dist}"
DOWNLOADS_ROOT="${DOWNLOADS_ROOT:-/home/saas/downloads}"
SAU_PACKAGE="${SAU_PACKAGE:-social-auto-upload.zip}"
MASS_PUBLISH_PACKAGE="${MASS_PUBLISH_PACKAGE:-群发助手.zip}"
SUBSITE_CACHE="${SUBSITE_CACHE:-/home/storage/subsite_cache}"
HTTP_FRONTEND_PORT="${HTTP_FRONTEND_PORT:-6888}"
USE_HTTPS="${USE_HTTPS:-true}"
SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/${TENANT_WILDCARD_DOMAIN}/fullchain.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-/etc/letsencrypt/live/${TENANT_WILDCARD_DOMAIN}/privkey.pem}"
# 模板站二级域（brand.makestoryforge.com 等）走 default_server，须用泛域证书
SUBSITE_SSL_CERT_PATH="${SUBSITE_SSL_CERT_PATH:-/etc/letsencrypt/live/${TENANT_WILDCARD_DOMAIN}/fullchain.pem}"
SUBSITE_SSL_KEY_PATH="${SUBSITE_SSL_KEY_PATH:-/etc/letsencrypt/live/${TENANT_WILDCARD_DOMAIN}/privkey.pem}"
# 从 backend 定时 rsync subsite_cache（需 BACKEND_RSYNC_SSH + SETUP_RSYNC_CRON=true）
BACKEND_RSYNC_SSH="${BACKEND_RSYNC_SSH:-}"
SETUP_RSYNC_CRON="${SETUP_RSYNC_CRON:-false}"
RSYNC_CRON_SCHEDULE="${RSYNC_CRON_SCHEDULE:-0 * * * *}"
BACKEND_STORAGE_ROOT="${BACKEND_STORAGE_ROOT:-/home/storage}"

set -e

if [ "$USE_HTTPS" = "true" ] && { [ ! -f "$SUBSITE_SSL_CERT_PATH" ] || [ ! -f "$SUBSITE_SSL_KEY_PATH" ]; }; then
  echo "Warning: subsite wildcard cert not found ($SUBSITE_SSL_CERT_PATH); template hosts may show wrong HTTPS."
  echo "  Issue cert for *.$TENANT_WILDCARD_DOMAIN first, or set SUBSITE_SSL_CERT_PATH / SUBSITE_SSL_KEY_PATH."
fi

echo "Starting xjdx Frontend static deployment..."
echo "  MAIN_SERVER_NAME=$MAIN_SERVER_NAME BACKEND_ORIGIN=$BACKEND_ORIGIN DIST_ROOT=$DIST_ROOT DOWNLOADS_ROOT=$DOWNLOADS_ROOT USE_HTTPS=$USE_HTTPS"
if [ "$USE_HTTPS" = "true" ]; then
  echo "  SSL_CERT_PATH=$SSL_CERT_PATH (console)"
  echo "  SUBSITE_SSL_CERT_PATH=$SUBSITE_SSL_CERT_PATH (template *.$TENANT_WILDCARD_DOMAIN)"
else
  echo "  HTTP_FRONTEND_PORT=$HTTP_FRONTEND_PORT"
fi

if [ ! -d "dist" ]; then
    echo "dist directory not found, checking for dist.zip..."

    if [ -f "dist.zip" ]; then
        echo "Found dist.zip, extracting..."
        unzip -o dist.zip -d temp_extract
        echo "Extraction completed."

        if [ -d "temp_extract/dist" ]; then
            mv temp_extract/dist dist
            rm -rf temp_extract
        elif [ -d "temp_extract/dist/dist" ]; then
            mv temp_extract/dist/dist dist
            rm -rf temp_extract
        else
            if [ -f "temp_extract/index.html" ]; then
                mv temp_extract dist
            else
                echo "Error: Could not find index.html in extracted files"
                rm -rf temp_extract
                exit 1
            fi
        fi
    else
        echo "Error: dist directory not found and dist.zip not found"
        echo "Upload dist or dist.zip to this directory, then run the script again."
        ls -la
        exit 1
    fi
fi

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "Error: dist directory is empty or missing index.html"
    ls -la dist/ 2>/dev/null || true
    exit 1
fi

echo "dist directory found and verified."

echo "Publishing dist -> $DIST_ROOT ..."
mkdir -p "$DIST_ROOT" "$SUBSITE_CACHE"
if command -v rsync &> /dev/null; then
  rsync -a --delete ./dist/ "${DIST_ROOT}/"
else
  find "$DIST_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -rf ./dist/. "${DIST_ROOT}/"
fi
echo "Synced to $DIST_ROOT"

echo "Publishing downloads -> $DOWNLOADS_ROOT ..."
mkdir -p "$DOWNLOADS_ROOT"
if [ -d "./downloads" ]; then
  if command -v rsync &> /dev/null; then
    rsync -a ./downloads/ "${DOWNLOADS_ROOT}/"
  else
    cp -rf ./downloads/. "${DOWNLOADS_ROOT}/"
  fi
  echo "Synced downloads to $DOWNLOADS_ROOT"
else
  echo "No ./downloads directory; skip sync (place $SAU_PACKAGE under $DOWNLOADS_ROOT manually if needed)"
fi

if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install nginx -y
fi

echo "Creating Nginx configuration..."

if [ "$USE_HTTPS" = "true" ]; then
  cat > /etc/nginx/sites-available/saas-xjdx << NGINX_HTTPS
server {
    listen 80;
    server_name $MAIN_SERVER_NAME;
    return 301 https://${MAIN_SERVER_NAME}\$request_uri;
}
server {
    listen 80 default_server;
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $MAIN_SERVER_NAME;

    ssl_certificate     $SSL_CERT_PATH;
    ssl_certificate_key $SSL_KEY_PATH;

    client_max_body_size 100M;
    root $DIST_ROOT;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    location ^~ /static {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /downloads/ {
        alias $DOWNLOADS_ROOT/;
        default_type application/octet-stream;
        add_header Content-Disposition "attachment";
        add_header Cache-Control "public, max-age=86400";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /api {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 443 ssl default_server;
    server_name _;

    ssl_certificate     $SUBSITE_SSL_CERT_PATH;
    ssl_certificate_key $SUBSITE_SSL_KEY_PATH;

    client_max_body_size 100M;

    set \$subsite_root $SUBSITE_CACHE/\$host;

    location = /robots.txt {
        rewrite ^ /_subsite/robots.txt break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location = /sitemap.xml {
        rewrite ^ /_subsite/sitemap.xml break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location = /sitemap.txt {
        rewrite ^ /_subsite/sitemap.txt break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location = /llms.txt {
        rewrite ^ /_subsite/llms.txt break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location = /llms-full.txt {
        rewrite ^ /_subsite/llms-full.txt break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /static {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /subsite.css {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /editorial.css {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /备案图标.png {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /login_bg.jpg {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /favicon.ico {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location = / {
        root \$subsite_root;
        try_files /index.html @fallback_index;
    }

    location @fallback_index {
        rewrite ^ /_subsite break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~ ^/(about|contact|privacy|terms)/?\$ {
        root \$subsite_root;
        try_files /\$1/index.html @fallback;
    }

    location ~ ^/columns/(\d+)/?\$ {
        root \$subsite_root;
        try_files /columns/\$1/index.html @fallback;
    }

    location ~ ^/articles/([^/]+)/?\$ {
        root \$subsite_root;
        try_files /articles/\$1/index.html @fallback;
    }

    location @fallback {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_HTTPS
else
  cat > /etc/nginx/sites-available/saas-xjdx << NGINX_HTTP
server {
    listen ${HTTP_FRONTEND_PORT};
    server_name $MAIN_SERVER_NAME;

    client_max_body_size 100M;
    root $DIST_ROOT;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    location ^~ /static {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /downloads/ {
        alias $DOWNLOADS_ROOT/;
        default_type application/octet-stream;
        add_header Content-Disposition "attachment";
        add_header Cache-Control "public, max-age=86400";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    location /api {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen ${HTTP_FRONTEND_PORT} default_server;
    server_name _;

    client_max_body_size 100M;

    set \$subsite_root $SUBSITE_CACHE/\$host;

    location ^~ /static {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /subsite.css {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /editorial.css {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /备案图标.png {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /login_bg.jpg {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /favicon.ico {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host ${BACKEND_PROXY_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location = / {
        root \$subsite_root;
        try_files /index.html @fallback_index;
    }

    location @fallback_index {
        rewrite ^ /_subsite break;
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~ ^/(about|contact|privacy|terms)/?\$ {
        root \$subsite_root;
        try_files /\$1/index.html @fallback;
    }

    location ~ ^/columns/(\d+)/?\$ {
        root \$subsite_root;
        try_files /columns/\$1/index.html @fallback;
    }

    location ~ ^/articles/([^/]+)/?\$ {
        root \$subsite_root;
        try_files /articles/\$1/index.html @fallback;
    }

    location @fallback {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        root $DIST_ROOT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass ${BACKEND_ORIGIN};
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_HTTP
fi

ln -sf /etc/nginx/sites-available/saas-xjdx /etc/nginx/sites-enabled/
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

echo "Testing Nginx configuration..."
nginx -t

echo "Reloading Nginx..."
systemctl reload nginx

# -- 可选：安装从 backend 拉取 subsite_cache 的定时任务 --
if [ "$SETUP_RSYNC_CRON" = "true" ] && [ -n "$BACKEND_RSYNC_SSH" ]; then
  SYNC_SCRIPT="/usr/local/bin/sync-saas-subsite-cache.sh"
  cat > "$SYNC_SCRIPT" << SYNC_EOF
#!/bin/bash
set -e
mkdir -p "$SUBSITE_CACHE"
rsync -az --delete -e ssh \\
  "${BACKEND_RSYNC_SSH}:${BACKEND_STORAGE_ROOT}/subsite_cache/" \\
  "${SUBSITE_CACHE}/"
SYNC_EOF
  chmod +x "$SYNC_SCRIPT"
  CRON_LINE="${RSYNC_CRON_SCHEDULE} ${SYNC_SCRIPT} >> /var/log/rsync-saas-subsite.log 2>&1"
  (crontab -l 2>/dev/null | grep -Fv "$SYNC_SCRIPT" || true; echo "$CRON_LINE") | crontab -
  echo "Rsync cron installed: $CRON_LINE"
  echo "Running initial subsite_cache sync..."
  "$SYNC_SCRIPT" || echo "Warning: initial rsync failed (check SSH key to backend)"
elif [ -z "$BACKEND_RSYNC_SSH" ]; then
  echo "Tip: set BACKEND_RSYNC_SSH + SETUP_RSYNC_CRON=true in deploy.env to sync subsite_cache hourly from ai.gaobobo.cn 宿主机"
fi

echo "Frontend static deployment completed!"
if [ "$USE_HTTPS" = "true" ]; then
  echo "  Main: https://${MAIN_SERVER_NAME}"
  echo "  群发助手: https://${MAIN_SERVER_NAME}/downloads/${MASS_PUBLISH_PACKAGE}"
  echo "  SAU package (legacy): https://${MAIN_SERVER_NAME}/downloads/${SAU_PACKAGE}"
  echo "  Sub-site: any domain configured in SaaS (HTTPS), fully static pages"
else
  echo "  Main: http://${MAIN_SERVER_NAME}:${HTTP_FRONTEND_PORT}"
  echo "  群发助手: http://${MAIN_SERVER_NAME}:${HTTP_FRONTEND_PORT}/downloads/${MASS_PUBLISH_PACKAGE}"
  echo "  SAU package (legacy): http://${MAIN_SERVER_NAME}:${HTTP_FRONTEND_PORT}/downloads/${SAU_PACKAGE}"
  echo "  Sub-site: any other Host on :${HTTP_FRONTEND_PORT} -> fully static pages"
fi
