# apps/api only. Microsoft's official Playwright image ships every OS-level shared library
# Chromium needs pre-installed (glib, nss, atk, etc.) — Railway's default Nixpacks builder has
# no apt-get, so `playwright install --with-deps` silently installed the browser binary but not
# its system dependencies, crashing every PDF report with "libglib-2.0.so.0: cannot open shared
# object file". This sidesteps that entire class of problem rather than hand-listing Nix
# packages that'll just go stale on the next Playwright version bump.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

# Force Node 22+ regardless of what this image ships — @supabase/supabase-js requires native
# WebSocket support, only built into Node 22+.
RUN apt-get update && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs

WORKDIR /app
COPY . .

RUN npm install
RUN npm run db:generate
RUN npm run build -w apps/api

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "apps/api"]
