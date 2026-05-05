# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all deps (needed for workspace resolution)
RUN npm ci --workspace=apps/api --workspace=packages/database --workspace=packages/shared --workspace=packages/email --include-workspace-root

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build API
RUN cd apps/api && npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json /app/turbo.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/apps/api/node_modules/ ./apps/api/node_modules/ 2>/dev/null || true

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
