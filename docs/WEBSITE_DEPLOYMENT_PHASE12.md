# Fern Client — Website & Launch Ecosystem Deployment Guide
## Phase 12 Architecture & Production Operations

### Overview

The Fern Client official website and download portal is a standalone, lightweight, zero-bloat Single Page Application (SPA) designed to be hosted cheaply and statically on any edge CDN or standard HTTP server (Cloudflare Pages, Vercel, AWS S3 + CloudFront, GitHub Pages, or Nginx/Caddy).

It compiles independently from the Electron desktop launcher and NestJS backend service.

---

### 1. Build Pipeline

The website source is located in the `website/` directory and compiles into `dist-website/`:

```bash
# Build the production static bundle
npm run build:website

# Local development live-reload server (runs at http://localhost:3000)
npm run dev:website
```

#### Build Artifacts Output (`dist-website/`):
- `index.html`: Fully semantic HTML5 shell with OpenGraph and preloaded fonts.
- `assets/index-*.js`: Modular Vite bundle containing React routing, markdown parser, and interactive sections.
- `assets/index-*.css`: Premium dark-first design system with responsive typography and reduced-motion rules.
- `robots.txt`: Search crawler directives allowing standard routes and disallowing private API hooks.
- `sitemap.xml`: Complete search indexing map covering all 9 primary site routes.

---

### 2. Environment Variables & Release Configuration

The static website is designed to be secure by default. **No private API keys, backend secrets, or Ed25519 signing keys are ever exposed in frontend assets.**

Optional build-time environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `VITE_RELEASE_METADATA_URL` | `/packaging/distribution.json` | Remote URL or relative path to authoritative release manifest. |
| `VITE_FEEDBACK_API_URL` | `/api/v1/feedback` | Backend API proxy path for support/feedback submissions. |
| `VITE_SITE_URL` | `https://fernclient.net` | Canonical site URL used for OpenGraph and sitemap generation. |

If `VITE_FEEDBACK_API_URL` is unreachable or offline, the support portal automatically falls back to client-side sanitized JSON report generation with a 1-click download button and GitHub issue template link.

---

### 3. Static Hosting Deployment Options

#### Option A: Cloudflare Pages (Recommended for Edge Caching & Zero Bandwidth Fees)
1. Link your Git repository in the Cloudflare Dashboard.
2. Configure build settings:
   - **Framework preset**: None / Vite
   - **Build command**: `npm run build:website`
   - **Build output directory**: `dist-website`
   - **Node.js version**: `22.x`
3. Configure Single-Page Application fallback rule:
   - Cloudflare Pages serves `index.html` on unknown routes automatically if configured in `_routes.json` or standard SPA mode.

#### Option B: Standalone Nginx / Reverse Proxy
A sample production Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name fernclient.net www.fernclient.net;

    # SSL Certificates (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/fernclient.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fernclient.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root static directory
    root /var/www/fern-client/dist-website;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.fernclient.net;" always;

    # Immutable asset caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy for feedback submissions
    location /api/v1/feedback {
        proxy_pass http://127.0.0.1:4000/api/v1/feedback;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### 4. Release Distribution & Binary Hosting

Executables and release packages (`FernClientSetup.exe`, `FernClient-1.0.0-Portable.zip`) should **not** be committed directly to Git history for large-scale production.

Instead:
1. Upload release artifacts to an S3-compatible object bucket or Cloudflare R2 bucket.
2. Bind the download subdomain (e.g., `downloads.fernclient.net`).
3. Maintain the digital signature manifest `distribution.json` signed with your private Ed25519 key (`FERN_RELEASE_PRIVATE_KEY`).
4. Ensure the website's `release-metadata.ts` points to verified SHA-256 hashes matching the uploaded objects.

---

### 5. Health Checks & Verification

- **HTTP Status Check**: Ensure `GET /` returns `200 OK` with `Content-Type: text/html`.
- **Sitemap Accessibility**: Ensure `GET /sitemap.xml` returns `200 OK` and valid XML syntax.
- **Robots.txt**: Ensure `GET /robots.txt` is accessible and references `/sitemap.xml`.
- **Direct Download Check**: Verify that `GET /dist/win/stable/FernClient-1.0.0-Portable.zip` returns `200 OK` and matches the published SHA-256 checksum (`904cfdfd91a627fdcd94af8d79f9db1689991302a330ab0aa78525159e5aa200`).

---

### 6. Rollback Procedures

If an invalid web asset is deployed:
1. Revert to the previous Git commit tag.
2. Run `npm run build:website`.
3. In CDN environments (Cloudflare / Vercel), click **Rollback to deployment** in the web dashboard for instant zero-downtime reversion.
4. Purge edge CDN cache for `/index.html`.
