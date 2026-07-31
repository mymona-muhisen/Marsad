FROM node:22-alpine

WORKDIR /app

# Lockfile-first so a source change does not reinstall the tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# The dev server, not a static build: it carries the /api proxy that keeps the
# browser same-origin (see vite.config.ts), so no CORS configuration is needed
# anywhere in the stack. --host binds beyond localhost so the port publishes.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
